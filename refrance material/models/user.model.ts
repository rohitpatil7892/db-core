import { User } from '../interfaces/user.interface';
import { DatabaseService } from '../services/database.service';
import bcrypt from 'bcrypt';
import { ApiError } from '../middlewares/error.middleware';
import logger from '../config/logger';

export interface UserWithRoles extends Omit<User, 'roles'> {
  roles: Array<{
    id: number;
    name: string;
  }>;
}

export interface CreateUserInput {
  username: string;
  password: string;
  email: string;
  full_name: string;
  phone?: string;
  roles?: string[];
}

export interface UpdateUserInput {
  email?: string;
  full_name?: string;
  phone?: string;
  is_active?: boolean;
}

export class UserModel {
  private static instance: UserModel;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): UserModel {
    if (!UserModel.instance) {
      UserModel.instance = new UserModel();
    }
    return UserModel.instance;
  }

  private createApiError(statusCode: number, message: string): ApiError {
    const error = new Error(message) as ApiError;
    error.statusCode = statusCode;
    return error;
  }

  public async createUser(user: User): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    // Replace password with hashed version
    const userWithHashedPassword = {
      ...user,
      password_hash: hashedPassword,
      password: undefined // Remove plain text password
    };

    // Remove password from the object before inserting
    delete userWithHashedPassword.password;

    return this.db.insert<User>('users', userWithHashedPassword);
  }

  public async getUserById(id: number): Promise<User | undefined> {
    const result = await this.db.queryOne<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result ?? undefined;
  }

  public async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    return this.db.update<User>('users', id, user);
  }

  public async deleteUser(id: number): Promise<boolean> {
    return this.db.delete('users', id);
  }

  public async getAllUsers(): Promise<User[]> {
    return this.db.query<User>('SELECT * FROM users ORDER BY created_at DESC');
  }

  public async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.queryOne<User>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result ?? undefined;
  }

  public async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.queryOne<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result ?? undefined;
  }

  public async checkUsernameExists(username: string): Promise<boolean> {
    return this.db.exists('users', { username });
  }

  public async checkEmailExists(email: string): Promise<boolean> {
    return this.db.exists('users', { email });
  }

  public async getUserRoles(id: string): Promise<Array<{ id: string; name: string; description?: string }>> {
    return this.db.query<{ id: string; name: string; description?: string }>(
      `SELECT r.id, r.name, r.description 
       FROM roles r 
       JOIN user_roles ur ON r.id = ur.role_id 
       WHERE ur.user_id = $1`,
      [id]
    );
  }

  public async assignRole(userId: string, roleId: string): Promise<void> {
    // Check if user exists
    const userResult = await this.db.queryOne<User>(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult) {
      throw this.createApiError(404, 'User not found');
    }

    // Check if role exists
    const roleResult = await this.db.queryOne<{ id: string }>(
      'SELECT id FROM roles WHERE id = $1',
      [roleId]
    );

    if (!roleResult) {
      throw this.createApiError(404, 'Role not found');
    }

    // Check if role is already assigned
    const existingRole = await this.db.queryOne<{ id: string }>(
      'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );

    if (existingRole) {
      throw this.createApiError(400, 'Role already assigned to user');
    }

    // Assign role
    await this.db.insert<{ user_id: string; role_id: string }>('user_roles', { user_id: userId, role_id: roleId });
  }

  public async removeRole(userId: string, roleId: string): Promise<void> {
    const result = await this.db.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING id',
      [userId, roleId]
    );

    if (result.length === 0) {
      throw this.createApiError(404, 'Role not assigned to user');
    }
  }
} 