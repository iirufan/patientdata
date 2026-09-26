import admin from "firebase-admin";


/* ======================================================
   FIREBASE ADMIN INITIALIZATION
====================================================== */

function initializeFirebaseAdmin() {

  if (
    admin.apps.length
  ) {

    return admin.app();

  }


  const serviceAccountJSON =
    process.env
      .FIREBASE_SERVICE_ACCOUNT_JSON;


  if (!serviceAccountJSON) {

    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not configured."
    );

  }


  let serviceAccount;


  try {

    serviceAccount =
      JSON.parse(
        serviceAccountJSON
      );

  }

  catch(error) {

    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON contains invalid JSON."
    );

  }


  return admin.initializeApp({

    credential:
      admin.credential.cert(
        serviceAccount
      )

  });

}


initializeFirebaseAdmin();


const adminAuth =
  admin.auth();

const adminDb =
  admin.firestore();


/* ======================================================
   ALLOWED ROLES
====================================================== */

const ALLOWED_ROLES = [

  "admin",
  "doctor",
  "nurse",
  "reception"

];


/* ======================================================
   API
====================================================== */

export default async function handler(
  req,
  res
) {

  /*
   * Only POST requests are allowed.
   */

  if (
    req.method !== "POST"
  ) {

    return res
      .status(405)
      .json({

        error:
          "Method not allowed."

      });

  }


  try {

    /* ==================================================
       VERIFY CALLING USER
    ================================================== */

    const authorization =
      req.headers.authorization ||
      "";


    if (
      !authorization.startsWith(
        "Bearer "
      )
    ) {

      return res
        .status(401)
        .json({

          error:
            "Authentication required."

        });

    }


    const idToken =
      authorization.substring(
        7
      );


    const decodedToken =
      await adminAuth
        .verifyIdToken(
          idToken
        );


    const callerUID =
      decodedToken.uid;


    /* ==================================================
       GET ADMIN PROFILE
    ================================================== */

    const callerRef =
      adminDb
        .collection("users")
        .doc(callerUID);


    const callerSnap =
      await callerRef.get();


    if (
      !callerSnap.exists
    ) {

      return res
        .status(403)
        .json({

          error:
            "User profile not found."

        });

    }


    const caller =
      callerSnap.data();


    if (
      caller.active !== true ||
      caller.role !== "admin"
    ) {

      return res
        .status(403)
        .json({

          error:
            "Administrator access required."

        });

    }


    /* ==================================================
       REQUEST DATA
    ================================================== */

    const {

      fullName,
      email,
      contact,
      licenseNo,
      specialty,
      role,
      password

    } = req.body || {};


    const cleanName =
      String(
        fullName || ""
      ).trim();


    const cleanEmail =
      String(
        email || ""
      )
        .trim()
        .toLowerCase();


    const cleanContact =
      String(
        contact || ""
      ).trim();


    const cleanLicense =
      String(
        licenseNo || ""
      ).trim();


    const cleanSpecialty =
      String(
        specialty || ""
      ).trim();


    const cleanRole =
      String(
        role || ""
      )
        .trim()
        .toLowerCase();


    const cleanPassword =
      String(
        password || ""
      );


    /* ==================================================
       VALIDATION
    ================================================== */

    if (!cleanName) {

      return res
        .status(400)
        .json({

          error:
            "Full name is required."

        });

    }


    if (!cleanEmail) {

      return res
        .status(400)
        .json({

          error:
            "Email is required."

        });

    }


    if (
      !cleanEmail.includes("@")
    ) {

      return res
        .status(400)
        .json({

          error:
            "Enter a valid email address."

        });

    }


    if (
      cleanPassword.length < 8
    ) {

      return res
        .status(400)
        .json({

          error:
            "Password must contain at least 8 characters."

        });

    }


    if (
      !ALLOWED_ROLES.includes(
        cleanRole
      )
    ) {

      return res
        .status(400)
        .json({

          error:
            "Invalid user role."

        });

    }


    /* ==================================================
       CREATE FIREBASE AUTH USER
    ================================================== */

    let newUser;


    try {

      newUser =
        await adminAuth
          .createUser({

            email:
              cleanEmail,

            password:
              cleanPassword,

            displayName:
              cleanName,

            emailVerified:
              false,

            disabled:
              false

          });

    }

    catch(error) {

      if (
        error.code ===
        "auth/email-already-exists"
      ) {

        return res
          .status(409)
          .json({

            error:
              "A user with this email already exists."

          });

      }


      throw error;

    }


    /* ==================================================
       CREATE FIRESTORE USER PROFILE
    ================================================== */

    try {

      await adminDb
        .collection("users")
        .doc(newUser.uid)
        .set({

          uid:
            newUser.uid,

          fullName:
            cleanName,

          fullNameLower:
            cleanName.toLowerCase(),

          email:
            cleanEmail,

          contact:
            cleanContact,

          licenseNo:
            cleanLicense,

          specialty:
            cleanSpecialty,

          role:
            cleanRole,

          active:
            true,

          createdAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),

          createdBy:
            callerUID,

          createdByEmail:
            decodedToken.email ||
            caller.email ||
            ""

        });


      /* =================================================
         AUDIT
      ================================================= */

      await adminDb
        .collection("systemAudit")
        .add({

          action:
            "USER_CREATED",

          targetUserId:
            newUser.uid,

          targetEmail:
            cleanEmail,

          targetRole:
            cleanRole,

          performedBy:
            callerUID,

          performedByEmail:
            decodedToken.email ||
            "",

          createdAt:
            admin.firestore
              .FieldValue
              .serverTimestamp()

        });


      return res
        .status(200)
        .json({

          success:
            true,

          uid:
            newUser.uid,

          message:
            "User created successfully."

        });

    }

    catch(error) {

      /*
       * Firestore failed after Authentication
       * account was created.
       *
       * Remove the Auth account so we don't
       * leave a half-created user.
       */

      try {

        await adminAuth
          .deleteUser(
            newUser.uid
          );

      } catch(cleanupError) {

        console.error(
          "Unable to rollback Auth user:",
          cleanupError
        );

      }


      throw error;

    }

  }

  catch(error) {

    console.error(
      "Create user error:",
      error
    );


    return res
      .status(500)
      .json({

        error:
          error.message ||
          "Unable to create user."

      });

  }

}
