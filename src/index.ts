import { createServer } from 'http'
import { execute, subscribe } from 'graphql'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { ApolloServer } from 'apollo-server-express'
import express from 'express'
import { createSchema } from './schema'

const main = async () => {
  // Required logic for integrating with Express
  const app = express()
  const httpServer = createServer(app)
  const schema = await createSchema()
  // Same ApolloServer initialization as before, plus the drain plugin.
  const server = new ApolloServer({
    schema,
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close()
            }
          }
        }
      }
    ]
  })

  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe
    },
    {
      server: httpServer,
      // Pass a different path here if your ApolloServer serves at
      // a different path.
      path: '/graphql'
    }
  )

  // More required logic for integrating with Express
  await server.start()
  server.applyMiddleware({
    app,

    // By default, apollo-server hosts its GraphQL endpoint at the
    // server root. However, *other* Apollo Server packages host it at
    // /graphql. Optionally provide this to match apollo-server.
    path: '/graphql'
  })

  // Modified server startup
  await new Promise<void>(resolve => httpServer.listen({ port: 4000 }, resolve))
  console.log(
    `🚀 Server ready at http://localhost:4000${server.graphqlPath}\nhttps://studio.apollographql.com/sandbox`
  )
}

main()
