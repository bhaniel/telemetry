# Package Name

This package is designed to work with OpenTelemetry. To get started, you need to set the following environment variables:

- `OPENTELTOKEN`: This is the token used for authentication.
- `OPENTELURL`: This is the URL of the OpenTelemetry server.
- `OPENTELTRACE`: This is a flag to enable or disable tracing.
- `OPENTELLOGGINGURL` : This is the URL for OpenTelemetry logs server

## Installation

To install this package, you can use npm or yarn:

```bash
npm install package-name
# or
yarn add package-name
```

## Usage

After installing the package, you can import it in your project:

```javascript
const packageName = require("package-name");
```

Remember to replace package-name with the actual name of your package.

## Configuration

To configure the package, you need to set the environment variables mentioned above. You can do this in your .env file or in your hosting environment.

```
OPENTELTOKEN=your_token
OPENTELURL=your_url
OPENTELTRACE=your_trace_flag
OPENTELLOGGINGURL=you_url_for_logs
```

Replace `your_token`, `your_url`,`you_url_for_logs` and `your_trace_flag` with your actual values.

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
import { setIgnorePaths } from 'your-package-name';

setIgnorePaths({}, false); // This will override the default paths with an empty object
setIgnorePaths({ '/test': true }); // This will add '/test' to the default paths
```

In the first example, the default paths are replaced with an empty object, which means no paths will be ignored. In the second example, the path '/test' is added to the default paths.

## Contributing

If you want to contribute to this project, please open an issue or a pull request.

## License

This project is licensed under the MIT License.
