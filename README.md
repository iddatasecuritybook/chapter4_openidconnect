# chapter4_openidconnect
Sample Express OpenID Connect integration

This project shows to build an OpenID Connect integration on top of an existing OAuth 2 implementation.

Running the project:

1. Clone this repository
2. Ensure MongoDB is running
3. Navigate to the projects folder
4. Install all modules by entering `npm install`
5. Install eslint and the [Google JS styleguide](http://google.github.io/styleguide/javascriptguide.xml) by running `npm install -D eslint eslint-config-google`
6. Start the server by typing `npm start`
7. Navigate to `http://localhost:3000` to retrieve client credentials
8. Request an Authorization Code and make sure to provide the `openid` scope
9. Retrieve an Access Token by providing the Authorization Code obtained in step 8
