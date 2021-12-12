import { Client } from 'pg'

export const createClient = async () => {
  const client = new Client({
    host: 'materialize',
    port: 6875,
    user: 'materialize',
    //   password : 'your_database_password',
    database: 'materialize'
  })
  await client.connect()
  // const res = await client.query('SELECT $1::text as message', ['Hello world!'])
  //   const res = await client.query('SHOW FULL VIEWS')
  // const res = await client.query('SHOW COLUMNS FROM market_orders_raw')

  //   console.log(res.rows) // Hello world!

  return client
}

type View = {
  name: 'string'
  type: 'user'
  materialized: boolean
  volatility: 'volatile'
}

export const getViews = async (client?: Client) => {
  const c = client || (await createClient())
  const res = await c.query<View>('SHOW FULL VIEWS')
  return res.rows.filter(view => view.materialized)
}

export type ColumnType =
  | 'double precision'
  | 'text'
  | 'timestamp with time zone'
type Column = {
  name: string
  nullable: boolean
  type: ColumnType
}

export const getColumns = async (view: string, client?: Client) => {
  console.log('GET ROWS', view)
  const c = client || (await createClient())
  const res = await c.query<Column>(`SHOW COLUMNS FROM ${view}`)
  return res.rows
}
