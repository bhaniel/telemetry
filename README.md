# Opentel

This package is designed to work with OpenTelemetry.
This package includes HTTP instrumentation to trace HTTP requests and responses by default ( can't be configured yet).
It uses the OpenTelemetry HTTP Instrumentation package and provides additional functionality to capture request and response bodies.
it also have inside the netsInstumration and the OpenTelemetry Meta Packages for Node

To get started, you need to set the following environment variables:

-   `OPENTELTRACE`: This is a flag to enable or disable tracing.
-   `OPENTEL_URL`: This is the URL of the OpenTelemetry server ( Collector ).
-   `OPENTEL_TOKEN`: This is the token used for OpenTelemetry server ( Collector ).
-   `OPENTEL_LOG_URL`: This is the URL for OpenTelemetry logs server.
-   `OPENTEL_LOG_TOKEN`: This is the Token for OpenTelemetry logs server.
-   `OPENTEL_CONSOLE`: Set this variable to any value to enable console logging.
-   `NODE_ENV`: This is a standard Node.js environment variable, set it to `production`, `development`, etc. based on your environment.
-   `OPENTEL_METRICS`: Set this variable to any value to enable metrics.
-   `OPENTEL_INIT`: Set this variable to any value to initialize OpenTelemetry.
-   `OPENTEL_DEBUG`: Set this variable to any value to enable debug mode.

## Installation

To install this package, you can use npm or yarn:

```bash
npm install @haniel/opentel
# or
yarn add @haniel/opentel
```

## Usage

After installing the package, you can import it in your project:

```javascript
const packageName = require("@haniel/opentel");
```

## Configuration

To configure the package, you need to set the environment variables mentioned above. You can do this in your .env file or in your hosting environment.

```
OPENTEL_TOKEN="collector_token"
OPENTEL_URL="collector_url"
OPENTEL_INIT=true
OPENTEL_DEBUG=true
```

Replace `collector_token`, `collector_url`, with your actual values.

### Ignore Paths

By default, certain paths are ignored by this package.

```json
{
    "/version": true,
    "/health_check": true,
    "/metrics": true,
    "/swagger": true,
    "/swagger-json": true,
    "/favicon.ico": true
}
```

Each key in this object is a path, and the value is a boolean indicating whether the path should be ignored (true) or not (false).

### Overriding Ignore Paths

You can override the default ignore paths by importing the `setIgnorePaths` function and passing your own object. The function takes two parameters:

1. An object where each key is a path and the value is a boolean indicating whether the path should be ignored (true) or not (false).
2. An optional boolean parameter that indicates whether the paths should be merged with the existing ones (true) or replace them (false). This parameter is `true` by default, which means the paths will be merged.

Here's how you can use `setIgnorePaths`:

```javascript
import { setIgnorePaths } from "@haniel/opentel";

setIgnorePaths({}, false); // This will override the default paths with an empty object
setIgnorePaths({ "/test": true }); // This will add '/test' to the default paths
```

In the first example, the default paths are replaced with an empty object, which means no paths will be ignored. In the second example, the path '/test' is added to the default paths.

## Contributing

If you want to contribute to this project, please open an issue or a pull request.

## License

This project is licensed under the MIT License.
