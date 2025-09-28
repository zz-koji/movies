import { User } from '../users/types';

declare module 'express' {
	export interface Request {
		user?: Omit<User, 'pin'>;
	}
}
