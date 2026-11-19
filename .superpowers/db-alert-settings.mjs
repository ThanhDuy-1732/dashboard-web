import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const [row] = await sql`
  update settings
  set telegram_chat_id = '2061115293',
      email_recipients = ${['thanhduyking1703@gmail.com']}::text[]
  where id = 1
  returning telegram_chat_id, email_recipients
`;
console.log(row);
await sql.end();
