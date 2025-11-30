# OAuth Migration Instructions

## Migration 24: Add OAuth Support

**File:** `24_ADD_OAUTH_SUPPORT.sql`

### What it does:
- Adds OAuth provider fields to Users table (facebook, apple)
- Makes password_hash nullable for OAuth-only users
- Adds indexes for performance
- Adds unique constraint for oauth_provider + oauth_id

### How to run:

#### Option 1: MySQL Command Line
```bash
mysql -u your_username -p your_database < migrations/24_ADD_OAUTH_SUPPORT.sql
```

#### Option 2: MySQL Workbench
1. Open MySQL Workbench
2. Connect to database: `jotx.your-database.de`
3. Open `24_ADD_OAUTH_SUPPORT.sql`
4. Execute the script

#### Option 3: Direct Query
Copy and paste the SQL from `24_ADD_OAUTH_SUPPORT.sql` into your MySQL client.

### Verification:
After running, verify the migration with:
```sql
DESCRIBE Users;
```

You should see these new columns:
- `oauth_provider` (ENUM: 'email', 'facebook', 'apple')
- `oauth_id` (VARCHAR(255))
- `oauth_profile` (JSON)
- `auth_method` (ENUM: 'email', 'oauth', 'both')

---

**Created:** 2025-11-04
**Status:** Ready to run
