# TODO

## System Flow

For an easy explanation of the components, data flow, user actions, and diagrams, read [docs/system-flow.md](docs/system-flow.md). For the exact files and calls used when adding a task through the form, read [docs/add-task-flow.md](docs/add-task-flow.md).

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.23.

## Development server

To start a local development server, run:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

The frontend selects its API URL from an environment file before Angular starts. Local development uses `.env.development`, while production builds use `.env.production`. If the selected file does not exist, the loader falls back to `.env`.

Create these files from `.env.example`:

```dotenv
# .env.development
API_BASE_URL=http://localhost:3000/api
```

```dotenv
# .env.production
API_BASE_URL=https://api.example.com/api
```

Start development with:

```bash
npm start
```

Build for production with:

```bash
npm run build
```

You can also select an environment explicitly with `npm run load-env:development` or `npm run load-env:production`. Deployment platforms may provide `API_BASE_URL` as an environment variable; it takes priority over the environment file.

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

To serve the production build locally, run:

```bash
npm run start:dist
```

The `--single` option makes the static server return `index.html` for Angular routes such as `/dashboard`, so refreshing a deep link does not return a 404.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
