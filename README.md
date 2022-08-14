

# End-To-End Encrypted Messaging

The .env file, which was ignored, contains values for "REACT_APP_MONGODB_CONNECTION" (create a collection at mongodb atlas to get your own) and "REACT_APP_JWT_SECRET" (random string). It also contains "GENERATE_SOURCEMAP=false"

## End-To-End?

Many servers, including Apple's servers, have the ability to decrypt your private messages. End-to-end services keep your private key, which is used to decrypt messages, out of the hands of backend services. Theoretically, only the client should be able to read their messages with end-to-end encryption.

## Get started

Retrieve all of the necessary dependencies with "npm i"

Run the server with "node server"

Run the react app with "npm start"

## Functionality

Register and login to an account. You will be able to add existing members to your contact list. They will have to add you in order to chat. Send messages and enjoy. Upon logout, you will lose access to your messages, as is intended in this protocol for safety.
