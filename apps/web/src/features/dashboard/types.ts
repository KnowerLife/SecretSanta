export type Tab = 'overview' | 'people' | 'access' | 'activity' | 'chat';

export type Mutation = (
  path: string,
  body?: unknown,
  method?: string,
  messageKey?: string,
) => Promise<boolean>;
