const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { google } = require('googleapis');
const serviceAccount = require('./service-account.json');

const app = express();
app.use(cors());
app.use(express.json());

const projectId = serviceAccount.project_id;

async function getAccessToken() {
  const jwtClient = new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    ['https://www.googleapis.com/auth/firebase.messaging']
  );
  const tokens = await jwtClient.authorize();
  return tokens.access_token;
}

app.post('/send-notification', async (req, res) => {
  const { token, title, body } = req.body;
  const accessToken = await getAccessToken();

  const message = {
    message: {
      token,
      notification: { title, body }
    }
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    }
  );

  const data = await response.json();
  res.status(200).send(data);
});

app.listen(3000, () => {
  console.log('🚀 Push server running on http://localhost:3000');
});
