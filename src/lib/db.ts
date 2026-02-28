import { Pool, QueryResultRow, types } from "pg";

// Parse NUMERIC/DECIMAL (OID 1700) as JavaScript numbers instead of strings
types.setTypeParser(1700, (val) => parseFloat(val));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/** Transform PostgreSQL lowercase column names back to uppercase to match existing interfaces */
function uppercaseKeys<T extends QueryResultRow>(row: T): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    result[key.toUpperCase()] = row[key];
  }
  return result as T;
}

/** Query wrapper that returns rows with uppercase column names */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: (string | number)[]
) {
  const result = await pool.query<T>(sql, params);
  return {
    ...result,
    rows: result.rows.map(uppercaseKeys),
  };
}

export default pool;
