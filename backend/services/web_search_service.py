import aiohttp
import asyncio
from typing import List, Dict, Any, Optional
from config import settings

class WebSearchService:
    def __init__(self, serpapi_key: Optional[str] = None, brave_api_key: Optional[str] = None):
        self.serpapi_key = serpapi_key or settings.serpapi_key
        self.brave_api_key = brave_api_key or settings.brave_api_key

    async def search(self, query: str, num_results: int = 5, search_api: str = "SerpAPI") -> List[Dict[str, Any]]:
        """Search the web using specified search API"""
        
        if search_api == "Brave Search" and self.brave_api_key:
            try:
                return await self._brave_search(query, num_results)
            except Exception as e:
                print(f"Brave Search failed: {e}")
        
        if search_api == "SerpAPI" and self.serpapi_key:
            try:
                return await self._serpapi_search(query, num_results)
            except Exception as e:
                print(f"SerpAPI failed: {e}")

        raise Exception("No valid web search API configured")

    async def _brave_search(self, query: str, num_results: int) -> List[Dict[str, Any]]:
        """Search using Brave Search API"""
        url = "https://api.search.brave.com/res/v1/web/search"
        
        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": self.brave_api_key
        }
        
        params = {
            "q": query,
            "count": num_results,
            "search_lang": "en",
            "country": "US",
            "safesearch": "moderate",
            "textDecorations": False,
            "spellcheck": True
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    for item in data.get("web", {}).get("results", []):
                        results.append({
                            "title": item.get("title", ""),
                            "url": item.get("url", ""),
                            "snippet": item.get("description", ""),
                            "source": "brave"
                        })
                    
                    return results[:num_results]
                else:
                    raise Exception(f"Brave Search API error: {response.status}")

    async def _serpapi_search(self, query: str, num_results: int) -> List[Dict[str, Any]]:
        """Search using SerpAPI"""
        url = "https://serpapi.com/search"
        
        params = {
            "q": query,
            "engine": "google",
            "api_key": self.serpapi_key,
            "num": num_results,
            "hl": "en",
            "gl": "us"
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    for item in data.get("organic_results", []):
                        results.append({
                            "title": item.get("title", ""),
                            "url": item.get("link", ""),
                            "snippet": item.get("snippet", ""),
                            "source": "serpapi"
                        })
                    
                    return results[:num_results]
                else:
                    raise Exception(f"SerpAPI error: {response.status}")

    async def search_news(self, query: str, num_results: int = 5, search_api: str = "SerpAPI") -> List[Dict[str, Any]]:
        """Search for news articles"""
        if search_api == "Brave Search" and self.brave_api_key:
            return await self._brave_news_search(query, num_results)
        elif search_api == "SerpAPI" and self.serpapi_key:
            return await self._serpapi_news_search(query, num_results)
        else:
            raise Exception("No valid news search API configured")

    async def _brave_news_search(self, query: str, num_results: int) -> List[Dict[str, Any]]:
        """Search news using Brave Search API"""
        url = "https://api.search.brave.com/res/v1/news/search"
        
        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": self.brave_api_key
        }
        
        params = {
            "q": query,
            "count": num_results,
            "search_lang": "en",
            "country": "US",
            "safesearch": "moderate",
            "textDecorations": False
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    for item in data.get("results", []):
                        results.append({
                            "title": item.get("title", ""),
                            "url": item.get("url", ""),
                            "snippet": item.get("description", ""),
                            "published_date": item.get("age", ""),
                            "source": "brave_news"
                        })
                    
                    return results[:num_results]
                else:
                    raise Exception(f"Brave News API error: {response.status}")

    async def _serpapi_news_search(self, query: str, num_results: int) -> List[Dict[str, Any]]:
        """Search news using SerpAPI"""
        url = "https://serpapi.com/search"
        
        params = {
            "q": query,
            "engine": "google_news",
            "api_key": self.serpapi_key,
            "num": num_results,
            "hl": "en",
            "gl": "us"
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    for item in data.get("news_results", []):
                        results.append({
                            "title": item.get("title", ""),
                            "url": item.get("link", ""),
                            "snippet": item.get("snippet", ""),
                            "published_date": item.get("date", ""),
                            "source": "serpapi_news"
                        })
                    
                    return results[:num_results]
                else:
                    raise Exception(f"SerpAPI News error: {response.status}")

    def is_configured(self) -> Dict[str, bool]:
        """Check which search APIs are configured"""
        return {
            "brave": bool(self.brave_api_key),
            "serpapi": bool(self.serpapi_key)
        }