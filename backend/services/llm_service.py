import httpx
import openai
import google.generativeai as genai
from typing import Dict, List, Optional
import logging

from config import settings

logger = logging.getLogger(__name__)

class GitHubChatClient:
    """
    GitHub Marketplace chat endpoint
    """
    def __init__(self, github_token: str):
        self.token = github_token
        self.base_url = "https://models.github.ai/inference"

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: Optional[int] = None,
    ) -> str:
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        logger.info(f"Sending GitHub API request: model={model}, messages={messages}")
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                r = await client.post(
                    f"{self.base_url}/chat/completions", headers=headers, json=payload
                )
                r.raise_for_status()
                response = r.json()
                logger.info(f"GitHub API response: {response}")
                return response["choices"][0]["message"]["content"].strip()
            except httpx.HTTPStatusError as e:
                logger.error(f"GitHub API error: status={e.response.status_code}, detail={e.response.text}")
                raise ValueError(f"GitHub API request failed: {e.response.text}")
            except Exception as e:
                logger.error(f"GitHub API unexpected error: {str(e)}")
                raise

class LLMService:
    def __init__(
        self,
        api_key: Optional[str] = None,
        gemini_api_key: Optional[str] = None,
        github_token: Optional[str] = None,
    ):
        # OpenAI
        self.openai_client = None
        if api_key and not api_key.startswith("gh"):
            self.openai_client = openai.AsyncOpenAI(api_key=api_key or settings.openai_api_key)

        # Gemini
        self.gemini_model = None
        if gemini_api_key or settings.gemini_api_key:
            genai.configure(api_key=gemini_api_key or settings.gemini_api_key)
            self.gemini_model = genai.GenerativeModel(settings.gemini_model)

        # GitHub
        self.github_client = None
        github_key = github_token or (api_key if api_key and api_key.startswith("gh") else None)
        if github_key:
            self.github_client = GitHubChatClient(github_key)
        logger.info(f"LLMService initialized: openai={bool(self.openai_client)}, gemini={bool(self.gemini_model)}, github={bool(self.github_client)}")

    async def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Unified entry point for all providers."""
        available_models = self.get_available_models()
        github_models = [m.replace("github://", "") for m in available_models["github"]]
        if model.startswith("github://") and model.replace("github://", "") not in github_models:
            logger.error(f"Model {model} not supported, available: {github_models}")
            raise ValueError(f"Model {model} not supported")
        logger.info(f"Generating response: model={model}, user_prompt={user_prompt}")
        if model.startswith("github://"):
            return await self._generate_github_response(
                system_prompt, user_prompt, model, temperature, max_tokens
            )
        elif model.startswith("gemini"):
            return await self._generate_gemini_response(
                system_prompt, user_prompt, temperature, max_tokens
            )
        elif model.startswith("gpt") or model.startswith("openai"):
            return await self._generate_openai_response(
                system_prompt, user_prompt, model, temperature, max_tokens
            )
        else:
            logger.error(f"Unsupported model: {model}")
            raise ValueError(f"Unsupported model: {model}")

    async def _generate_openai_response(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str,
        temperature: float,
        max_tokens: Optional[int],
    ) -> str:
        if not self.openai_client:
            logger.error("OpenAI API key not configured")
            raise ValueError("OpenAI API key not configured")
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        kwargs = {"model": model, "messages": messages, "temperature": temperature}
        if max_tokens:
            kwargs["max_tokens"] = max_tokens
        logger.info(f"OpenAI request: model={model}, messages={messages}")
        try:
            response = await self.openai_client.chat.completions.create(**kwargs)
            logger.info(f"OpenAI response: {response.choices[0].message.content}")
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI error: {str(e)}")
            raise

    async def _generate_gemini_response(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: Optional[int],
    ) -> str:
        if not self.gemini_model:
            logger.error("Gemini API key not configured")
            raise ValueError("Gemini API key not configured")
        combined_prompt = f"{system_prompt}\n\nUser: {user_prompt}\n\nAssistant:"
        gen_config = genai.types.GenerationConfig(temperature=temperature)
        if max_tokens:
            gen_config.max_output_tokens = max_tokens
        logger.info(f"Gemini request: prompt={combined_prompt}")
        try:
            response = self.gemini_model.generate_content(
                combined_prompt, generation_config=gen_config
            )
            logger.info(f"Gemini response: {response.text}")
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini error: {str(e)}")
            raise

    async def _generate_github_response(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str,
        temperature: float,
        max_tokens: Optional[int],
    ) -> str:
        if not self.github_client:
            logger.error("GitHub token not configured")
            raise ValueError("GitHub token not configured")
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        model_name = model.replace("github://", "", 1)
        try:
            response = await self.github_client.chat(
                messages, model_name, temperature, max_tokens
            )
            logger.info(f"GitHub response: {response.choices[0].message.content}")
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"GitHub response error: {str(e)}")
            raise

    def get_available_models(self) -> dict:
        models = {"openai": [], "gemini": [], "github": []}
        if self.openai_client:
            models["openai"] = [
                "gpt-3.5-turbo",
                "gpt-3.5-turbo-16k",
                "gpt-4",
                "gpt-4-turbo-preview",
                "gpt-4o-mini",
            ]
        if self.gemini_model:
            models["gemini"] = ["gemini-pro", "gemini-pro-vision"]
        if self.github_client:
            models["github"] = [
                "github://gpt-4o-mini",
                "github://Meta-Llama-3-8B-Instruct",
                "github://openai/gpt-4.1",
            ]
        logger.info(f"Available models: {models}")
        return models

    async def test_model(self, model: str) -> dict:
        test_prompt = "Hello, this is a test. Please respond with 'Test successful'."
        logger.info(f"Testing model: {model}")
        try:
            response = await self.generate_response(
                system_prompt="You are a helpful assistant.",
                user_prompt=test_prompt,
                model=model,
                temperature=0.1,
            )
            logger.info(f"Model test successful: {model}, response={response}")
            return {
                "model": model,
                "status": "success",
                "response": response,
                "working": True,
            }
        except Exception as e:
            logger.error(f"Model test failed: {model}, error={str(e)}")
            return {
                "model": model,
                "status": "error",
                "error": str(e),
                "working": False,
            }