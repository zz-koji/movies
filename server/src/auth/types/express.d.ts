import { User } from '../users/types';

declare module 'express' {
  export interface Response {
    user?: Omit<User, 'pin'>;
  }

  export interface Request {
    user?: Omit<User, 'pin'>;
  }
}
