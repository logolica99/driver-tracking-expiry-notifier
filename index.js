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
var serviceAccount = require("./driver-tracking-c7772-firebase-adminsdk-3bsnt-1e7fb70d12.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://driver-tracking-c7772-default-rtdb.firebaseio.com",
});

var expiryData = [];
const getExpiryDates = (data) => {
  const temp = {};
  temp["email"] = data.applicantInformation.email;
  temp["physicalExamExpirationDate"] =
    data.applicantInformation.physicalExamExpirationDate;
  temp["licenceExpireDates"] = data.drivingExperience.driverLicenseList.dates;
  temp["licenceStates"] = data.drivingExperience.driverLicenseList.states;
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
    var mailOptions = {
      from: "trackingdriver22@gmail.com",
      to: data.email,
    };
    if (data.physicalExamExpirationDate < todaysDate) {
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
    data.licenceExpireDates.forEach((date, index) => {
      if (date < todaysDate) {
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
  });
};

setInterval(getServerData, 86400000);
