import { sql } from 'slonik';
import type { CommonQueryMethodsType } from 'slonik';

type UUID = string;

type UserRecord = {
  email: string;
};

type PersistedUserRecord = UserRecord & {
  id: UUID;
  createdAt: Date;
};

class UserService {
  constructor(readonly db: CommonQueryMethodsType) {}

  async findById(id: UUID): Promise<PersistedUserRecord | null> {
    const query = sql`
      SELECT id, email, created_at AS "createdAt"
      FROM   users
      WHERE  id = ${id}`;

    try {
      const user = await this.db.maybeOne<PersistedUserRecord>(query);
      return user;
    } catch (e) {
      return null;
    }
  }

  all(): Promise<readonly PersistedUserRecord[]> {
    const query = sql`
      SELECT   id, email, created_at AS "createdAt"
      FROM     users 
      ORDER BY created_at DESC`;

    return this.db.any<PersistedUserRecord>(query);
  }

  async create(attrs: UserRecord): Promise<PersistedUserRecord> {
    const stmt = sql`
      INSERT INTO users (email)
      VALUES      (${attrs.email})
      RETURNING   id, email, created_at AS "createdAt"`;

    const user = await this.db.one<PersistedUserRecord>(stmt);
    return user;
  }
}

export { UserService };
