# Materialize GraphQL endpoints

Scans [Materialize](https://materialize.com/) views and expose them into basic GraphQL queries and subscriptions.

This attempt is meant to [integrate Materialize with Hasura while a solution is found to directly plug Materialize as a source in Hasura](https://github.com/MaterializeInc/materialize/issues/4150).

Not production-ready, only food for thought.

## How to use

1. Clone this repo
2. `docker-compose up`
3. Create views with `psql -U materialize -h localhost -p 6875 materialize`
4. Restart the NodeJS service
5. Open the Hasura console on [http://localhost:8080/console](http://localhost:8080/console)
6. Connect a remote schema: `http://graphql-proxy:4000/graphql`
