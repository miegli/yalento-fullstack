## Yalento fullstack

This awesome package creates a fullstack web application. Angular as the frontend and firebase as the backend.
- Automated integration tests (swagger definitions against backend)
- Including bitbucket pipeline
- Automated generation of models and json-schema based on swagger definitions
- Swagger editor included
- Compile time and runtime checks integrated

### Install

#### 1. Global packages
`npm install -g firebase-tools @angular/cli`

#### 2. Create angular app
`ng new app && cd ./app`

#### 3. Init new firebase project
- Add database, firestore, functions, hosting and emulators. 
- Select always default values if you are asked from firebase cli.
- Select functions, firestore, database and hosting for Emulator Setup.

`firebase init `

#### 4. Add yalento packages
`npm add yalento-fullstack yalento`

#### 5. Complete installation

`npm install`

#### 6. Ready to develop

- `npm run yalento:compile:watch`: Start yalento im live-compiling mode.
- `npm run swagger:edit`: Open swagger editor ui in browser.
- `npm run yalento:test:api`: Test swagger definitions against firebase backend.

#### 7. Having fun

**Import automatically generated models and helper**
```ts
import {Pet, isInvalide} from 'yalento-fullstack';`

const pet: Pet = {
  name: 'bunny'
};

console.log(isInvalide("Pet", pet));

```
- This will console.log an error with detailed infos wy the data is not matching against the definitions in ./swagger.yaml (runtime check)
- The above code cannot be built using the typescript compiler because the interface is wrong (compile time check)

**Compatible with Yalento** 
```ts
import { Repository, IEntity } from 'yalento';
const repository: Repository<Pet> = new Repository(Pet, 'Pet');
```
Read more about [Yalento](https://www.npmjs.com/package/yalento).


