const admin = require("firebase-admin");
const { of } = require("await-of");

const serviceAccount = require("./serviceAccount.json");
const { sendEmail } = require("../mail");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const isValidRequest = async (req, res) => {
  const idToken = req.get("idToken");

  if (!idToken) {
    res.status(401).json({ message: "idToken not provided" });
  }

  const [claims, error] = await of(admin.auth().verifyIdToken(idToken));

  if (error) {
    res.status(401).json({ message: "Authentication failed", error });
  }

  if (claims && claims.admin) {
    return true;
  } else if (claims && claims.email === "admin@hremp.com") {
    const [success] = await of(
      admin.auth().setCustomUserClaims(claims.user_id, { admin: true })
    );

    if (success) {
      return true;
    } else {
      res.status(401).json({ message: "Authentication failed", error });
    }
  } else {
    res.status(403).json({
      message: "You are unauthorised for this request",
      error,
    });
  }
};

const createUser = async (req, res) => {
  await isValidRequest(req, res);

  const { firstName, lastName, email } = req.body;

  const [user, userCreationError] = await of(
    admin.auth().createUser({
      email,
      displayName: firstName + " " + lastName,
    })
  );

  if (userCreationError) {
    res.json({
      message: "User could not be created",
      error: userCreationError,
    });
    return;
  }

  sendEmail(email);

  res.json({ message: "User created successfully!", data: user });
};

const getUsers = async (req, res) => {
  await isValidRequest(req, res);

  admin
    .auth()
    .listUsers()
    .then((data) => {
      res.status(200).json({ message: "Users fetched successfully!", data });
    })
    .catch((error) => {
      res.status(404).json({ message: "Users could not be fetched", error });
    });
};

module.exports = {
  createUser,
  getUsers,
};
