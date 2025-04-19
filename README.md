# Multimodal Chatbot Demo

Features:

- Patternfly 6 based UI, using the Chatbot component, with support for multimodal models

## Application

### Backend

The [app backend](./app/backend/) is a simple FastAPI application that handles all the communications with the models servers and the client.

The configuration is set in a single [config.json](./app/backend/config.json.example) file, which makes it easier to be kept in a Secret mounted at runtime for the [deployment](./app/deployment/deployment.yaml) on OpenShift.

### Frontend

This is a [Patternfly 6](https://www.patternfly.org/) application, connected to the backend through  Websocket to receive and display the content streamed by the backend.

### Deployment on OpenShift

- The application container image is available at [https://quay.io/repository/rh-aiservices-bu/multimodal-chatbot](https://quay.io/repository/rh-aiservices-bu/multimodal-chatbot).
- Deployment files examples are available in the [Deployment](./app/deployment/) folder.
- An example configuration file for accessing the models and vector database is available [here](./app/backend/config.json.example). Once modified with your own values, it must be created as a Secret with:

    ```bash
    oc create secret generic multimodal-chatbot --from-file=config.json
    ```

- To display the username at the top-right corner of the application and in chat messages, OAuth protection must be enabled via a sidecar container.
