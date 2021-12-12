import { GraphQLList, GraphQLNonNull } from 'graphql'
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLSchema,
  GraphQLFieldConfigMap,
  GraphQLOutputType,
  GraphQLFloat
} from 'graphql'
import { PubSub } from 'graphql-subscriptions'
import { Client } from 'pg'
import { ColumnType, createClient, getColumns, getViews } from './materialize'

const pubsub = new PubSub()
type SubscriptionRow = Record<string, unknown> & {
  mz_timestamp: string
  mz_diff: string
}
const subscribeToView = async (view: string, client?: Client) => {
  const c = client || (await createClient())
  await c.query('BEGIN')
  await c.query(`DECLARE c CURSOR FOR TAIL ${view}`)
  while (true) {
    const res = await c.query<SubscriptionRow>('FETCH ALL c')
    pubsub.publish(
      view,

      res.rows
        .filter(row => row.mz_diff === '1')
        .map(({ mz_diff, mz_timestamp, ...data }) => data)
    )
  }
}

const toGqlTypes: Record<ColumnType, GraphQLOutputType> = {
  'double precision': GraphQLFloat,
  text: GraphQLString,
  'timestamp with time zone': GraphQLString
}

export const createSchema = async () => {
  const client = await createClient()
  const views = await getViews(client)
  const types = await views.reduce<Promise<Record<string, GraphQLObjectType>>>(
    async (acc, view) => {
      const previous = await acc
      const columns = await getColumns(view.name, client)
      return {
        ...previous,
        [view.name]: new GraphQLObjectType({
          name: view.name,
          fields: columns.reduce<GraphQLFieldConfigMap<any, any>>(
            (viewFields, column) => {
              const type = toGqlTypes[column.type]
              viewFields[column.name] = {
                type: column.nullable ? type : new GraphQLNonNull(type)
              }
              return viewFields
            },
            {}
          )
        })
      }
    },
    Promise.resolve({})
  )
  const fields = views.reduce<GraphQLFieldConfigMap<any, any>>((acc, view) => {
    const type = types[view.name]
    return {
      ...acc,
      [view.name]: {
        type: new GraphQLList(type),
        args: {},
        resolve: async (_, { id }) => {
          const res = await client.query(`SELECT * FROM ${view.name}`)
          return res.rows
        }
      }
    }
  }, {})

  const query = new GraphQLObjectType({
    name: 'Query',
    fields
  })
  subscribeToView('avg_bid')
  const subscription = new GraphQLObjectType({
    name: 'Subscription',
    fields: views.reduce<GraphQLFieldConfigMap<any, any>>((acc, view) => {
      const type = types[view.name]
      return {
        ...acc,
        [view.name]: {
          type: new GraphQLList(type),
          // args: {},
          resolve: async (_, { id }) => {
            const res = await client.query(`SELECT * FROM ${view.name}`)
            return res.rows
          },
          subscribe: () => pubsub.asyncIterator([view.name])
        }
      }
    }, {})
  })
  const schema = new GraphQLSchema({ query, subscription })

  return schema
}
