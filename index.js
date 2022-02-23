require("dotenv").config();
const functions = require("firebase-functions");
var nodemailer = require("nodemailer");
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

const express = require("express");

const admin = require("firebase-admin");
const app = express();

serviceAccount = {
  type: "service_account",
  project_id: "driver-tracking-c7772",
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY,
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-3bsnt%40driver-tracking-c7772.iam.gserviceaccount.com",
};
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://driver-tracking-c7772-default-rtdb.firebaseio.com",
});


var expiryData = [];
var expiredData = [];
const getExpiryDates = (data) => {
  const temp = {};
  temp["email"] = data.applicantInformation.email;
  temp["phoneNumber"] = data.applicantInformation.mobileNumber;
  temp["physicalExamExpirationDate"] =
    data.applicantInformation.physicalExamExpirationDate;
  temp["licenceExpireDates"] = data.drivingExperience.driverLicenseList.dates;
  temp["licenceStates"] = data.drivingExperience.driverLicenseList.states;
  temp["maintenanceDue"] = data.vehicleInventory.maintenanceDue;
  expiryData.push(temp);
  console.log(expiryData);
};

const getServerData = () => {
  expiryData = [];
  var db = admin.database();
  var ref = db.ref("/users");

  ref.once("value", function (snapshot) {
    if (snapshot.exists) {
      var data = snapshot.val();
      Object.keys(data).forEach((key) => {
        getExpiryDates(data[key]);
        // console.log(data[key]);
      });
      checkAndSendMail();
    } else {
      console.log("no data found");
    }
    //
  });
};

const checkAndSendMail = () => {
  const todaysDate = new Date();
  expiryData.forEach((data) => {
    var temp = { email: data.email, phoneNumber: data.phoneNumber };

    var mailOptions = {
      from: "trackingdriver22@gmail.com",
      to: data.email,
    };
    if (data.physicalExamExpirationDate < todaysDate) {
      temp["physicalExamExpired"] = true;

      mailOptions["subject"] = "Certificate Expiration";
      mailOptions["text"] =
        "You medical certificate has expired please renew it";
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    }
    if (data.maintenanceDue < todaysDate) {
      temp["maintenanceDue"] = true;
      mailOptions["subject"] = "Maintenance Due";
      mailOptions["text"] = "You Maintenance Due has expired please renew it";
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    }
    data.licenceExpireDates.forEach((date, index) => {
      if (date < todaysDate) {
        temp[`${data.licenceStates[index]}LicenceExpired`] = true;
        mailOptions["subject"] = "Certificate Expiration";
        mailOptions[
          "text"
        ] = `Your ${data.licenceStates[index]} licence  has expired please renew it`;
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });
      }
    });

    if (Object.keys(temp).length > 1) {
      expiredData.push(temp);
    }
  });
};

getServerData();
setInterval(getServerData, 86400000);

const port = process.env.PORT || 3001;
app.get("/", (req, res) => {
  res.send("Email notifier every 24 Hours");
});

app.get("/expiredData", (req, res) => [res.json(expiredData)]);

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
