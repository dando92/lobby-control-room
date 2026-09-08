export type Act = (action: () => Promise<unknown>) => Promise<void>;
