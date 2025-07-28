import UserQueryNode from './UserQueryNode';
import LLMNode from './LLMNode';
import KnowledgeBaseNode from './KnowledgeBaseNode';
import WebSearchNode from './WebSearchNode';
import OutputNode from './OutputNode';

export const nodeTypes = {
  userQuery: UserQueryNode,
  llm: LLMNode,
  knowledgeBase: KnowledgeBaseNode,
  webSearch: WebSearchNode,
  outputN: OutputNode,
};

export {
  UserQueryNode,
  LLMNode,
  KnowledgeBaseNode,
  WebSearchNode,
  OutputNode,
};