const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const { google } = require("googleapis");
const cron = require("node-cron");

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.PROJECT_ID,
  private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.CLIENT_EMAIL,
  token_uri: 'https://oauth2.googleapis.com/token'
};

const app = express();
app.use(cors());
app.use(express.json());

const projectId = serviceAccount.project_id;

async function getAccessToken() {
  const jwtClient = new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    ["https://www.googleapis.com/auth/firebase.messaging"]
  );
  const tokens = await jwtClient.authorize();
  return tokens.access_token;
}

//  Manual test endpoint
app.post("/send-notification", async (req, res) => {
  const { token, title, body } = req.body;
  const accessToken = await getAccessToken();

  const message = {
    message: {
      token,
      notification: { title, body },
    },
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  const data = await response.json();
  res.status(200).send(data);
});

// 📤 Scheduled push logic
async function sendNotificationToDevices() {
  const accessToken = await getAccessToken();
  const tokens = await getDevicesToNotify(); // Implement this

  for (const token of tokens) {
    await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: '💧 Water Reminder',
            body: 'Some of your plants need watering!'
          }
        }
      })
    });
  }
}

//  Schedule 3 times a day
cron.schedule('0 8 * * *', sendNotificationToDevices);   // 08:00
cron.schedule('0 13 * * *', sendNotificationToDevices);  // 13:00
cron.schedule('0 18 * * *', sendNotificationToDevices);  // 18:00

// Start server once
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Push server running with cron + manual at http://localhost:${port}`);
});
