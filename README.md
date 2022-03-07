# Backend for the Website of Christoph Anton-Cornelius Bärtsch

## Setup

- fill the `ormconfig.json` file with your database connection
- replace the certificates in `./secrets` with your own
- replace the secret key in `constants.ts` with your own
- place static website under `./website`
- run `typeorm schema:sync` once to sync the database with the schema

## API Documentation

### Authentication

Currently, there is only one admin user. This user can upload and delete files.  
The user is authenticated by a JWT token. The token is generated by the server and sent to the client.  
It will be valid for 15 minutes.

#### POST

`https://domain:3000/auth/login` _returns the token, it requires the following body:_

```json
{
  "username": "...",
  "password": "..."
}
```

Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImRvbWluaWsiLCJzdWIiOjEsImlhdCI6MTY0NTkwNjc5NywiZXhwIjoxNjQ1OTA3Njk3fQ.ayFmmlOSEY6pTxcLATgSO7wf7pWvkpM5lNrYk4WhFdY"
}
```

### Stills

#### GET

`https://domain:3000/stills/uuid` _returns the still as stream, metadata is encoded in headers_

`https://domain:3000/stills/uuid/thumbnail` _returns the thumbnail of the still as stream, metadata is encoded in headers_

`https://domain:3000/stills/` _returns a list of all stills_

Example Response:

```json
[
  {
    "id": "83f51b91-b66e-49f0-8773-b06b6f613d15",
    "hash": "7d3ee0c0bc4fe041b63360ca2bfef583f28f460d2e8ca6f01f357baa2c7d1bcb",
    "position": 0
  },
  {
    "id": "84522e61-4294-401c-afda-d27f04512d09",
    "hash": "eac318afddd47fc4d8cf6de3579d4cfe28316173dbac3c6906d652fe991d9b38",
    "position": 1
  },
  {
    "id": "1d11878c-b31b-4332-aeff-ff2bd43bf269",
    "hash": "f7f471ccf608f5868002cb8fb14d557fb03e62ba247c10d177ac68214a4869d9",
    "position": 2
  },
  {
    "id": "768c3805-163b-4c96-b18d-a56d92eb5151",
    "hash": "5d3d47eb829a7394e5c1e44597397b083e18e7ee14f4dfba289168f5cdb09179",
    "position": 3
  }
]
```

`https://domain:3000/stills/amount/` _returns the amount of stills_

`https://domain:3000/stills/amount/amount` _returns `amount` stills, starting at position 0 up to `amount-1`_

`https://domain:3000/stills/amount/from/to` _returns `amount` stills, starting at position `from` up to `to`_

#### POST

`https://domain:3000/stills` _uploads a still, the body contains the file, form field label is `file`_

#### DELETE

`https://domain:3000/stills/uuid` _deletes the still with the given uuid_

#### PATCH

<!-- `https://domain:3000/stills/uuid` _inserts still into new position (position has to be a json body)_
`https://domain:3000/stills/uuid1/uuid2` _replaces two positions with each other_ -->
<!-- TODO -->

`https://doimain:3000/stills/replace`

### Videos

#### GET

<!-- TODO -->

#### POST

<!-- TODO -->
