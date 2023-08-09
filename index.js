const functions = require("firebase-functions");
const express = require("express");
const nodemailer = require("nodemailer");
const app = express();
const axios = require("axios");
const fs = require("fs");
const Jimp = require("jimp");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const qs = require("qs");

initializeApp({
  storageBucket: "donjuliotequila-f8f5e.appspot.com",
});

const db = getFirestore();
const bucket = getStorage().bucket();
const BRANDING_IMAGE_URL =
  "https://firebasestorage.googleapis.com/v0/b/finalheineken.appspot.com/o/fotosGeneradas%2FHeineken-Postal.png?alt=media&token=311b429c-7abf-4fb2-a5f2-bfb4a046e3fb&_gl=1*1nuqo6k*_ga*MTAzMDY2OTQ2NC4xNjg1ODA4MjY4*_ga_CW55HF8NVT*MTY4NjA3MTg0Mi4xMi4xLjE2ODYwNzIzOTkuMC4wLjA.";

//CABEZERAS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Allow", "GET, POST, OPTIONS, PUT, DELETE");
  next();
});

const validCode = async (code) => {
  let nuevoCodigo = db.collection("codes").doc(code);

  try {
    let doc = await nuevoCodigo.get();

    if (doc.exists) {
      const data = doc.data();

      if (data.state === true) {
        // El estado es verdadero (true)
        console.log("El estado es true");
      } else {
        // El estado no es verdadero (false)
        console.log("El estado no es true");
      }

      return data.state;
    } else {
      // El documento no existe
      console.log("El documento no existe");
      return undefined;
      // Realiza las operaciones adicionales que desees
    }
  } catch (e) {
    // Error al obtener el documento
    console.error("Error al obtener el documento:", error);
    // Realiza las operaciones adicionales que desees
  }
};

const sendEmail = (toEmail, urlBase) => {
  console.log(urlBase);
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "finalheineken@gmail.com", // generated ethereal user
      pass: "aukfsbzoexqgkhcu", // generated ethereal password
    },
  });

  // Contenido del correo electrónico
  const mailOptions = {
    from: "finalheineken@gmail.com",
    to: toEmail,
    subject: "Evento Heineken",
    text: "¡Ya estas registrado. Te esperamos! \n Usa Waze para llegar a Zoológico La Aurora, Parqueo Zoológico La Aurora, Zona 13, \n Guatemala: https://waze.com/ul/h9fxeh13z8 ",
    attachments: [
      {
        path: urlBase,
        filename: "archivo.png",
        contentType: "image/png",
      },
    ],
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error(error);
    } else {
      console.log("Correo enviado con éxito: " + info.response);
    }
  });
};

app.post("/customer", async (req, res) => {
  const nuevoUsuario = db.collection("customer").doc(req.body.uniqueId);

  let usuarioNuevo = await nuevoUsuario.set({
    nombre: req.body.nombre,
    apellido: req.body.apellido,
    //email: req.body.email,
    celular: req.body.celular,
    stateConfirmation: false,
    createAt: new Date(),
    uniqueId: req.body.uniqueId,
  });

  res.json({ type: true, message: "Felicidades ya estas participando" });
});

app.get("/code", async (req, res) => {
  const getCode = db.collection("codes").doc(req.query.code);
  getCode
    .get()
    .then((doc) => {
      if (doc.exists) {
        console.log("Document data:", doc.data());
        res.json({ data: doc.data() });
      } else {
        // doc.data() will be undefined in this case
        console.log("No such document!");
        res.json({ data: [] });
      }
    })
    .catch((error) => {
      console.log("Error getting document:", error);
    });
});

app.post("/send", async (req, res) => {
  const accountSid = "AC49a32a9637ef5da0fb9fed11f71efc8c";
  const authToken = "0d203060ad8e24983f9823edf05ea502";
  const client = require("twilio")(accountSid, authToken);
  client.messages
    .create({
      body: "Hola como estas ! bienvenido :) ",
      from: "whatsapp:+14155238886",
      to: "whatsapp:+50257185251",
    })
    .then((message) => res.status(200).send(message))
    .catch((error) => res.status(500).send(error));
});

app.post("/activeCode", async (req, res) => {
  try {
    let nuevoCodigo = db.collection("customer").doc(`${req.body.name}${req.body.code}`);
    await nuevoCodigo.update({
      stateConfirmation: true,
      useAt: new Date(),
    });

    res.json({
      activated: true,
    });
  } catch (error) {
    res.json({
      activated: false,
    });
  }
});

app.post("/sendImage", sendImageToSD);

async function sendImageToSD(req, res) {
  let usuario = db.collection("customer").doc(req.body.uniqueId);
  
  let prompt = ``;

  if (req.body.club === "Manchester City") {
    // Manchester
    prompt = `place in stadiun soccer, hyper realistic, wearing uniform inter milan blue #0000a3, looking at camera smiling, hazel eyes, heavy lights, caustic, volumetric lighting, real life, highly detailed, photography, strong contrasting shadows, depth of field, atmospheric perspective, sharp focus, realistic proportions, good anatomy, (realistic, hyperrealistic:1 4), 16k hdr, style hologram, bloom, glow effects, full sharp, dramatic lighting`;
  } else {
    // Inter
    prompt = `place in stadiun soccer, hyper realistic, wearing uniform inter milan blue #0000a3, looking at camera smiling, hazel eyes, heavy lights, caustic, volumetric lighting, real life, highly detailed, photography, strong contrasting shadows, depth of field, atmospheric perspective, sharp focus, realistic proportions, good anatomy, (realistic, hyperrealistic:1 4), 16k hdr, style hologram, bloom, glow effects, full sharp, dramatic lighting`;
  }

  var options = {
    method: "POST",
    url: "https://stablediffusionapi.com/api/v3/img2img",
    headers: { "Content-Type": "application/json" },
    data: {
      key: "oXMUqcEV9ZFrPBYle7z2ijIbkLFD9xuXywSUBiS4sUD3sfHKkTWAmJ4qFMnF",
      prompt: prompt,
      negative_prompt: "(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation",
      init_image: req.body.imageUrl,
      width: "512",
      height: "912",
      samples: "4",
      num_inference_steps: "30",
      safety_checker: "no",
      enhance_prompt: "yes",
      guidance_scale: 7.5,
      strength: 0.7,
      seed: null,
      webhook: `https://us-central1-codefinalheineken.cloudfunctions.net/heineken/imageCallback/${req.body.uniqueId}/1`,
      track_id: null,
    },
  };

  try {
    let response = await axios.request(options);

    switch (response.data.status) {
      case "success":
        let brandedImage = await downloadImage(response.data.output[0], `fotosGeneradas/${response.data.id}.jpg`);

        await usuario.update({
          taskId: response.data.id,
          generationDone: true,
          generatedImage: brandedImage,
        });

        let response = await sendWhatsapp(usuarioData.celular, brandedImage);
        console.info(response.data);
        break;
      case "processing":
        await usuario.update({
          taskId: response.data.id,
          generationDone: false,
        });
        break;
      default:
        res.json(response.data);
        break;
    }

    res.json({
      taskId: response.data.id,
    });
  } catch (error) {
    console.log(error);
    res.json(error);
  }
}

app.post("/imageCallback/:doc/:version", sdCallback);

async function sdCallback(req, res) {
  let usuarioRef = db.collection("customer").doc(req.params.doc);
  let usuarioData = (await usuarioRef.get()).data();

  switch (req.body.status) {
    case "success":
      let brandedImage = await downloadImage(req.body.output[0], `fotosGeneradas/${req.body.id}.jpg`);

      await usuarioRef.update({
        taskId: req.body.id,
        generationDone: true,
        generatedImage: brandedImage,
      });

      let response = await sendWhatsapp(usuarioData.celular, brandedImage);
      console.info(response.data);
      
      break;
    case "processing":
      await usuarioRef.update({
        taskId: req.body.id,
        generationDone: false,
      });
      break;
    default:
      break;
  }

  res.json({
    received: true,
  });
}

async function downloadImage(sourceURL, filename) {
  let brandedImageBase64 = await brandImage(sourceURL);

  let buffer = Buffer.from(brandedImageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  let file = bucket.file(filename);

  await file.save(buffer, {
    metadata: {
      contentType: "image/jpeg",
    },
    public: true,
  });

  let [metadata] = await file.getMetadata();

  return metadata.mediaLink;
}

async function brandImage(imageURL) {
  let imageBase = await Jimp.read(imageURL);
  let brand = await Jimp.read(BRANDING_IMAGE_URL);

  let mergedImage = new Jimp(imageBase.getWidth(), imageBase.getHeight());

  mergedImage.composite(imageBase, 0, 0);
  mergedImage.composite(brand, 0, 0);

  return await mergedImage.getBase64Async(Jimp.AUTO);
}

async function sendWhatsapp(phone, imageURL) {
  let WAdata = qs.stringify({
    token: "7fmuhqlis56kr0sg",
    to: phone.slice(1),
    image: imageURL,
    caption: `
      Este es el resultado de tu experiencia iA con Heineken.
      ¡Ya estás registrado, te esperamos!
      Usa Waze para llegar a Zoológico La Aurora, Parqueo Zoológico La Aurora, Zona 13, Guatemala: https://waze.com/ul/h9fxeh13z8
    `,
    priority: "",
    referenceId: "",
    nocache: "",
    msgId: "",
    mentions: "",
  });

  var config = {
    method: "post",
    url: "https://api.ultramsg.com/instance49047/messages/image",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: WAdata,
  };

  let WAresponse = await axios(config);

  return WAresponse;
}

app.get("/getAllDataCustomers", async (req, res) => {
  let getAllCustomers = db.collection("customer").where("stateConfirmation", "=", true);
  const tempDoc = [];
  getAllCustomers
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        tempDoc.push({ id: doc.id, ...doc.data() });
      });
      console.log(tempDoc);
      res.json(tempDoc);
    })
    .catch((e) => {
      console.log(e);
      res.json({ err: true, message: e });
    });
});

app.post("/codes", async (req, res) => {
  const codes = [
    "X6FVY",
    "mt8ei",
    "whLiK",
    "XJpBw",
    "eGaUq",
    "FBx7X",
    "txLN6",
    "eJy7s",
    "EBE8H",
    "u5xhG",
    "UK9zV",
    "g5t9P",
    "4AmFZ",
    "edYWL",
    "gFANU",
    "VMdS2",
    "ajSyU",
    "fpcie",
    "4ZZg6",
    "iAh3j",
    "3jCws",
    "pc8eK",
    "kjCCK",
    "u5VHo",
    "KftNW",
    "AnZat",
    "PGmHn",
    "pdScv",
    "XQ6r5",
    "KMHrd",
    "w7rrj",
    "Jtf7n",
    "7Wxhv",
    "89Nhy",
    "STF2E",
    "roPix",
    "AyXcU",
    "CZXdP",
    "LhCs2",
    "SwTj7",
    "rxaUS",
    "WExuT",
    "PN2YY",
    "bYpCh",
    "Uq8pw",
    "S2fNv",
    "82Xo8",
    "HrKmg",
    "TVE8Z",
    "F6uVf",
    "UZbrs",
    "tGPKU",
    "HGHip",
    "YxzH7",
    "sYbPj",
    "9vBZB",
    "3XYdY",
    "6j8sW",
    "Bx9R8",
    "8b7xW",
    "NthED",
    "Eonr3",
    "D8kWC",
    "epN9s",
    "Mj8vk",
    "BFmwo",
    "aLmze",
    "dkJ8w",
    "SUzyW",
    "PGgZ6",
    "VKBqv",
    "MWYQa",
    "YbqGZ",
    "ktLgf",
    "MF8Ay",
    "ZVTms",
    "YM6qg",
    "2mrRa",
    "jQKzp",
    "PJxEG",
    "tfg72",
    "9fspN",
    "b5sic",
    "CzL6k",
    "qmLJ6",
    "PUrbr",
    "AZvFk",
    "eS3zZ",
    "zzeuZ",
    "Tgtvq",
    "VbUA4",
    "JAi5b",
    "kHvcA",
    "dBXeZ",
    "opjpD",
    "MuWro",
    "JkAaq",
    "JWmYp",
    "fiAHS",
    "LnpGR",
    "exbkm",
    "Kpxve",
    "r6Yna",
    "6aFHe",
    "7PTAH",
    "P7waR",
    "DeXrz",
    "tv9FP",
    "TPZEu",
    "XJwBY",
    "RCBQc",
    "ocqD5",
    "naqwH",
    "9Fzxo",
    "jPDQd",
    "usHN7",
    "5nJDi",
    "Xq6DP",
    "kTSTn",
    "m6VRu",
    "4ez2B",
    "2iydW",
    "i3kCt",
    "5aoap",
    "ZoHSB",
    "SDhhv",
    "2Z53e",
    "jQ3bZ",
    "s5LzF",
    "z69LP",
    "LLtPU",
    "QZtvv",
    "WffZJ",
    "GjrBD",
    "VNkwS",
    "SKvfg",
    "3YsCx",
    "9EBKf",
    "huPTh",
    "wiUt2",
    "zTBj4",
    "ESxv5",
    "ggwac",
    "yWKxb",
    "Zrjre",
    "YrFPE",
    "a6Dub",
    "twdQp",
    "JUTLW",
    "eKGHE",
    "eKGHE",
    "oqRmf",
    "urMmF",
    "ocQRQ",
    "GCXsJ",
    "oKjcw",
    "ZRptA",
    "fTmJ4",
    "qTQ87",
    "XsDmZ",
    "HizsG",
    "ShVQ7",
    "dMQx7",
    "UDhpA",
    "C6tcC",
    "nQKoh",
    "YZ7Bg",
    "BswnG",
    "Yjyhe",
    "asp6f",
    "pBsGZ",
    "joT6x",
    "A7Cd7",
    "HUras",
    "LX4mX",
    "h7cGZ",
    "B7Bye",
    "iVWg9",
    "2FoEb",
    "atDVR",
    "hQWcb",
    "EmvDk",
    "Z6xtY",
    "UFPTz",
    "2zLbk",
    "GxMf6",
    "d5vjc",
    "fUooz",
    "zWQBS",
    "3jmRR",
    "sgAFd",
    "99A68",
    "uot26",
    "jYp9B",
    "SiUmZ",
    "fvEwP",
    "nPNL9",
    "xchrM",
    "2hr4X",
    "hgqTP",
    "dSoBx",
    "MerZz",
    "MLJE7",
    "4Fh3q",
    "vgpwW",
    "DopdE",
    "MpTfY",
    "VHQt9",
    "4XZ2S",
    "cFnm4",
    "9Q9St",
    "4StaS",
    "eGiWJ",
    "kvNhK",
    "nUtDC",
    "AfFkF",
    "kmbnK",
    "eY7wd",
    "bCR4m",
    "qBApb",
    "5cHEE",
    "u8VzH",
    "QCMH7",
    "c6jAV",
    "eFhyo",
    "zyaax",
    "Esq8y",
    "vjJQo",
    "33fGf",
    "WPQCk",
    "TR3Tz",
    "N3VKQ",
    "CPByD",
    "NH5UH",
    "hSp99",
    "Pq7b4",
    "qk9e3",
    "fSMku",
    "WVprH",
    "uqjpV",
    "xTJDb",
    "G8ec8",
    "kciJC",
    "MWntP",
    "JYaSP",
    "U9fWu",
    "zukJG",
    "hP3ci",
    "KhSgS",
    "x2JHg",
    "Yj5gz",
    "ZNKhT",
    "7aQAX",
    "2UmpW",
    "J36EQ",
    "pSCyh",
    "gM2KQ",
    "oBiqt",
    "FbqMC",
    "4xvk8",
    "qzv4i",
    "6gbaf",
    "2A2Sr",
    "G3WG9",
    "CGoX6",
    "FXLn3",
    "wEbhL",
    "QuiZ2",
    "iCeMk",
    "ByFFQ",
    "uWrzA",
    "gbzLv",
    "iAtMz",
    "5BpAW",
    "MNhf7",
    "efjN9",
    "8JSNV",
    "RCtEo",
    "M7Fk6",
    "DHevg",
    "w4BVF",
    "jR3uG",
    "ZknXm",
    "qBRVU",
    "i97hW",
    "skoSB",
    "HjJZS",
    "RZ6am",
    "azazV",
    "oGqdA",
    "J8r5J",
    "rEYSE",
    "VFL2L",
    "Drov9",
    "GCM2p",
    "EgvBo",
    "rjEJ5",
    "dgn7U",
    "SSLpE",
    "hU7KV",
    "FpgTd",
    "DAGzz",
    "Nx9hR",
    "5LwhD",
    "6DVKD",
    "kvyQ5",
    "CskWq",
    "GdYKi",
    "vrcHg",
    "GGCAk",
    "yb2s9",
    "KNZJA",
    "AsZ2w",
    "rzvmh",
    "gsyxy",
    "y3btS",
    "CMDNg",
    "xak25",
    "FXPig",
    "daQbx",
    "fiur9",
    "dUNHL",
    "tFahe",
    "tnREB",
    "8EXCx",
    "Rd95y",
    "Vcicq",
    "hoTDg",
    "pVAVV",
    "fHygc",
    "MowS6",
    "q2C3k",
    "JdnuX",
    "5XooV",
    "4ECp8",
    "Pe6Jb",
    "AXHT5",
    "SmCjV",
    "U3c4p",
    "FB2iw",
    "XZXjQ",
    "EkWGa",
    "qqiXx",
    "cycAH",
    "jV6Wy",
    "xzXFM",
    "9i7Wy",
    "4LgNk",
    "Re4sc",
    "W5RYi",
    "XsY9b",
    "cJen3",
    "XtKuA",
    "DMJGt",
    "44ZzM",
    "Wbcdu",
    "ffuMk",
    "Fb9Up",
    "9aZhj",
    "bhAXU",
    "RosJk",
    "26dFW",
    "yfism",
    "C7ASu",
    "S9VGE",
    "hnueq",
    "yAa22",
    "aVMxs",
    "KmFts",
    "QMdwP",
    "KmruZ",
    "JiVEz",
    "gLfYV",
    "omjGp",
    "EdPFc",
    "LNbtN",
    "Ret3d",
    "GUJRq",
    "JqrQK",
    "viLhB",
    "nxn9S",
    "GVG7m",
    "ukfQ8",
    "LmXMu",
    "bYPm3",
    "wH8oA",
    "YVaLM",
    "GkVdc",
    "UncHR",
    "PDwFH",
    "cdCma",
    "WREBR",
    "yspz6",
    "2Gnvp",
    "fnddy",
    "tm3hL",
    "Kngnw",
    "dWXGj",
    "DDyoW",
    "dtbvg",
    "k6CLd",
    "akSrT",
    "qEU5E",
    "aCb7U",
    "2w48R",
    "hmc9L",
    "WJRnN",
    "NxGx9",
    "9kBU6",
    "caiLK",
    "NdUef",
    "yB2MG",
    "gMGJ4",
    "bMaeE",
    "9z4nK",
    "hQjn6",
    "SpLEN",
    "UQdgR",
    "QgSvK",
    "Q2Q7c",
    "owVXm",
    "wT8Jw",
    "jn3Ci",
    "roXch",
    "JJC3X",
    "hLkmG",
    "FPpcf",
    "RYjZ3",
    "vsKsr",
    "B6StB",
    "eHGVH",
    "sxxBn",
    "gpxS3",
    "vDTq4",
    "EFED3",
    "h5o8U",
    "w7PbM",
    "PAuYh",
    "yrcKb",
    "qUzrr",
    "WKcQx",
    "3RtJd",
    "XqXXq",
    "5mMbc",
    "XzTGP",
    "hSuvP",
    "vgymk",
    "8bQQE",
    "LT2UG",
    "pGSUT",
    "6E453",
    "nBo2A",
    "tofVc",
    "vsMu2",
    "UQ2Sy",
    "QJ2Dy",
    "NHtCg",
    "mT83u",
    "sxBGc",
    "9HgjM",
    "uALeC",
    "9fuJE",
    "5KVMY",
    "qbd4d",
    "sD4nH",
    "fQYYi",
    "acMPh",
    "UpF43",
    "WtsQr",
    "o3tfC",
    "QPHgi",
    "r6XvQ",
    "uDuV5",
    "qgaXu",
    "hTPXG",
    "7iAxH",
    "AgRch",
    "3wpoT",
    "oLQdn",
    "2svLA",
    "ptRdw",
    "UaExn",
    "9BAgM",
    "N6s9u",
    "eaJQH",
    "GCjAu",
    "FSqFq",
    "v4dgi",
    "YN4cF",
    "aZveT",
    "F2MkN",
    "CTVyx",
    "wausf",
    "yG9Sr",
    "aZosU",
    "pizvU",
    "X2VjQ",
    "K6cke",
    "GZZAZ",
    "4X5kd",
    "4apWx",
    "hqass",
    "NaL2L",
    "w3dk4",
    "phwDq",
    "iAM7M",
    "NdB5j",
    "i9MZh",
    "nn8BX",
    "zeqnP",
    "EG6ii",
    "dst4s",
    "SfX2q",
    "4wgxX",
    "c4476",
    "YPBL9",
    "XKqYQ",
    "xqGjv",
    "oTdGv",
    "fGQ8v",
    "JUxTw",
    "UG4Ld",
    "5u3K7",
    "Zb7Ai",
    "HLRNu",
    "jMGdd",
    "xDRES",
    "Q7DFb",
    "Y7akH",
    "A3Q8t",
    "oEtPC",
    "zNXhS",
    "bfKC4",
    "7zXwf",
    "kDXrU",
    "2MkWt",
    "A52XC",
    "KFtiQ",
    "MExVv",
    "44i5W",
    "VQucP",
    "nycX2",
    "wm9xV",
    "EhKnn",
    "5ummy",
    "PHqiG",
    "8ZtfP",
    "CBrHf",
    "d6LbP",
    "AwodZ",
    "Zh99u",
    "wEggw",
    "9Vfji",
    "vYxXW",
    "Z6Brv",
    "j8fxU",
    "PDQbP",
    "39Mcq",
    "bs2Gg",
    "gL3bJ",
    "pEoUW",
    "SR4Uf",
    "yn8BK",
    "JjxA9",
    "fRSvq",
    "gDW6A",
    "V6rQf",
    "6nAET",
    "DbmP7",
    "PZ8FT",
    "2it53",
    "7Fr4t",
    "7iuVN",
    "zqqXN",
    "ZLG4H",
    "2uoyg",
    "AoEr5",
    "tvW7m",
    "BDHtt",
    "AYnvo",
    "msw64",
    "qYqRh",
    "UXoBo",
    "svrzC",
    "ZsjHk",
    "Ci8t5",
    "6ndNf",
    "JmtXi",
    "8zJro",
    "52mLn",
    "vYxA2",
    "89rst",
    "n9xQv",
    "rwGdW",
    "deUah",
    "2hBvb",
    "Zv2EF",
    "hcYcZ",
    "5pdXC",
    "A9kgY",
    "4JMUr",
    "nuVYu",
    "gUbrc",
    "KGgL4",
    "tmi6E",
    "ivDc2",
    "q5YvF",
    "G5nLF",
    "v8nJv",
    "T89kj",
    "J72Hg",
    "tPdRD",
    "vFret",
    "M2aXB",
    "HTW8R",
    "eB7BX",
    "GZ447",
    "QtmR3",
    "UM883",
    "4E3p7",
    "9Hh6s",
    "8q4BH",
    "nahUk",
    "VgNw6",
    "sH8GW",
    "cLYFQ",
    "XwKfU",
    "fEKxt",
    "L9muV",
    "Qtc5d",
    "ioqw3",
    "KGgpd",
    "pZ44X",
    "KwVjM",
    "o7dCj",
    "Ntj3L",
    "mcbBg",
    "M9eVk",
    "uVZZW",
    "UrGPn",
    "a6YWe",
    "s9STa",
    "5JtHK",
    "WsVHv",
    "FDeq5",
    "bdJWY",
    "gMnkn",
    "6mAzf",
    "zXNZf",
    "UMqZr",
    "ms5dT",
    "89Bv5",
    "vrgQG",
    "upqFV",
    "MVKWg",
    "soqK6",
    "pgMhg",
    "HrAQu",
    "ff7Sv",
    "kxdiz",
    "eCpAp",
    "uy5rj",
    "X76Ei",
    "jxtbf",
    "U5FL4",
    "NZNVJ",
    "FGhKJ",
    "Biono",
    "UvVBZ",
    "zTdWR",
    "L6e98",
    "LZfH7",
    "WweU5",
    "nKszA",
    "Ujj7B",
    "Hu6NS",
    "nBhs2",
    "9UPvh",
    "r5h9t",
    "4hhFU",
    "UGfY2",
    "NA4Q6",
    "sB3uZ",
    "VoZzV",
    "LWxFy",
    "aLZxp",
    "XBcxr",
    "iTP2a",
    "G8Dat",
    "5tMkA",
    "dHfBt",
    "8PLeg",
    "5Jf5U",
    "xBXtN",
    "iNnUL",
    "hLdTM",
    "wmDid",
    "waoGE",
    "EY5gu",
    "oB9W9",
    "4wPpF",
    "nCTtY",
    "yjtPj",
    "vwxyw",
    "tbZQW",
    "XYszX",
    "fD5G4",
    "iqi4a",
    "yE7UL",
    "G99Fr",
    "zXXvt",
    "aPuPA",
    "nrGaj",
    "UUMjw",
    "CF257",
    "YgvDq",
    "BxzLT",
    "V88nb",
    "wUNj3",
    "JDoeM",
    "VoUhB",
    "mPUkj",
    "VYA7K",
    "tWSaE",
    "YBkPU",
    "yqB5U",
    "QkuwK",
    "H7zwn",
    "Sp3Zh",
    "WbxVV",
    "YyebT",
    "aJ5LV",
    "MNMEE",
    "QpFRE",
    "2PfiS",
    "pD3CF",
    "dqiik",
    "iVPgt",
    "nDjNB",
    "yvKpG",
    "mqgdD",
    "u34yz",
    "jUoZp",
    "nE3iq",
    "yPZ4n",
    "TYWkj",
    "iMSyN",
    "erQHc",
    "CZCv4",
    "Sswac",
    "4nMjs",
    "JRFBJ",
    "Y3enm",
    "6b6kG",
    "uz8gq",
    "Dzgk4",
    "YkbuE",
    "v3NiG",
    "ZpqkH",
    "5fQxM",
    "DbHUK",
    "HUWLQ",
    "UYMXu",
    "QAgdQ",
    "9TBCB",
    "yE39a",
    "g8BxS",
    "NG4iJ",
    "RhhkU",
    "qCeMf",
    "4txaG",
    "mmiQ7",
    "jHh3m",
    "ogv5v",
    "VJWQe",
    "pRVwx",
    "WjexS",
    "AUtQB",
    "AStu9",
    "mbNRm",
    "KUWDG",
    "T8don",
    "ofmTd",
    "72cCv",
    "8N4ox",
    "af7tT",
    "FuiBx",
    "VpS5Y",
    "VYxRe",
    "t4RNZ",
    "sqJU8",
    "Kfwd9",
    "k6wmZ",
    "4Egph",
    "tptAS",
    "v968x",
    "cUDU9",
    "FhPTm",
    "sbKov",
    "oV5mH",
    "44e7f",
    "GumRA",
    "79RN9",
    "BUVsb",
    "4bfoY",
    "WMyhm",
    "bSy37",
    "KHktc",
    "h3qfd",
    "ubUnS",
    "dFEHM",
    "WLfba",
    "CziQV",
    "juqMf",
    "doP5U",
    "vG8rg",
    "cmXum",
    "dnfbo",
    "MTxtE",
    "rg88t",
    "ng6TE",
    "J6WfM",
    "oU3Q9",
    "bCWSF",
    "i6iaU",
    "PFVMX",
    "dvxFd",
    "jVbWt",
    "YRLuv",
    "f4ZXs",
    "pKcqd",
    "cX75h",
    "TL9B2",
    "FfF3L",
    "UukRy",
    "HaRM7",
    "oRyaM",
    "5HBAn",
    "9wwsk",
    "DmyGH",
    "5VMdk",
    "UW3jx",
    "TwhNX",
    "oNoLF",
    "D3Gbc",
    "PHHeJ",
    "jwTgQ",
    "J9dLo",
    "RMdDB",
    "559JF",
    "ADrFG",
    "ALJfu",
    "AeSKX",
    "ApwJt",
    "Avwme",
    "BABPC",
    "BvzKJ",
    "CMrPs",
    "CWiXp",
    "CrKmz",
    "DFtBR",
    "DJSNS",
    "DWwEW",
    "DgpcK",
    "DpXiG",
    "DtrXk",
    "EEhLy",
    "EJscm",
    "ETeEd",
    "EujZu",
    "Ewekw",
    "FARdh",
    "FKUwR",
    "FLctk",
    "FQycF",
    "FpntL",
    "FyCGT",
    "FySrA",
    "GJRAi",
    "GhYRj",
    "GobvY",
    "HkvNr",
    "HqRzk",
    "HswAQ",
    "HwQfa",
    "JUMVy",
    "JUpPy",
    "JdYdS",
    "JpYbB",
    "JwnMT",
    "KppuR",
    "LPdpN",
    "LbxUQ",
    "LhgMf",
    "LjoUM",
    "LkKWd",
    "MJAqr",
    "MKXCE",
    "MMzqV",
    "MVVZr",
    "MfRqk",
    "MoqdL",
    "MsaZN",
    "NGcZe",
    "NWtEb",
    "NdaKd",
    "NeJrx",
    "NfCNz",
    "NgpDt",
    "NmqAX",
    "NnBXG",
    "PEYYQ",
    "PMVii",
    "PdNHq",
    "PgfUj",
    "PsbPg",
    "QeBnp",
    "RQAGN",
    "RVWQv",
    "RobEW",
    "RwyES",
    "SRyVU",
    "SeoWa",
    "ShaWe",
    "SkQgn",
    "SndAb",
    "TEAVY",
    "TEnfB",
    "TFENg",
    "TGoJu",
    "TMAKo",
    "TMYFP",
    "TaAui",
    "TjWHs",
    "UEgcV",
    "UgabP",
    "UhypF",
    "VVNch",
    "VXLKF",
    "VYqNL",
    "VZLsF",
    "Vakgi",
    "VjRRF",
    "WEgLS",
    "WUTQg",
    "WXFBE",
    "WYtHT",
    "WytSs",
    "XPdVK",
    "XUtrH",
    "XaLmJ",
    "XkNcc",
    "Xtrtx",
    "YvJUB",
    "ZYmjW",
    "ZbUgK",
    "ZeDzV",
    "ZwvjD",
    "aNLrJ",
    "acxDc",
    "auHYv",
    "bEDEg",
    "bfsZR",
    "cBdsw",
    "cDbhh",
    "cKqxg",
    "cfSXf",
    "cocjb",
    "ctYJk",
    "dKymS",
    "dZbXC",
    "dfeRn",
    "dkTJr",
    "dkgbr",
    "dmmgM",
    "dyuSB",
    "fATJP",
    "fGtQN",
    "fWCuk",
    "fbrLQ",
    "fdEHh",
    "fmKVM",
    "fnZkF",
    "gMoQX",
    "gUszv",
    "gYvzN",
    "gbpqY",
    "ggpFn",
    "gthDR",
    "gtrfB",
    "gvFVW",
    "hYsVo",
    "habjv",
    "hbejm",
    "hdCym",
    "igGoJ",
    "ijTvZ",
    "ioVQF",
    "isXei",
    "ixVxe",
    "jCNMr",
    "joZXp",
    "kCJpq",
    "kDQiZ",
    "kaMKY",
    "kbtyd",
    "mgxAL",
    "mwjXg",
    "nVTrW",
    "ndeJL",
    "nuTNN",
    "oMmYU",
    "oNLGm",
    "oWvYM",
    "oaGCe",
    "ohiaN",
    "oxjMk",
    "pDYBS",
    "pFKZV",
    "pGpSV",
    "pqrex",
    "qXvtv",
    "rHXfi",
    "rQqBx",
    "rgpEr",
    "rnEkV",
    "rpYEe",
    "rrVwu",
    "rwKqm",
    "sEETH",
    "sPFsL",
    "saZRZ",
    "sdjhn",
    "skvpS",
    "srpRS",
    "tNEwA",
    "tfzgd",
    "uYgub",
    "uagLc",
    "uhdoK",
    "umGWx",
    "wRHwH",
    "wUqmc",
    "xCWQD",
    "yxDFV",
    "zTMoR",
    "zXrLN",
    "ziVvF",
    "zpYsE",
    "zvsfJ",
  ];

  codes.map(async (code) => {
    let nuevoCodigo = db.collection("codes").doc(code);

    return await nuevoCodigo.set({
      code,
      state: false,
      createAt: new Date(),
    });
  });

  res.json({});
});

app.post("/getConfirmation", async (req, res) => {
  console.log(`${req.body.name}${req.body.code}`);
  let nuevoCodigo = db.collection("customer").doc(`${req.body.name}${req.body.code}`);

  try {
    let doc = await nuevoCodigo.get();

    if (doc.exists) {
      const data = doc.data();
      if (data.stateConfirmation === true) {
        // El estado es verdadero (true)
        console.log("El estado es true");
        //return true;
        res.json({ type: true, message: "El codigo no esta activo" });
        // Realiza las operaciones adicionales que desees
      } else {
        // El estado no es verdadero (false)
        console.log("El estado no es true");
        //return false;
        res.json({ type: false, message: "El codigo no esta activo" });
        // Realiza las operaciones adicionales que desees
      }
    } else {
      // El documento no existe
      console.log("El documento no existe");
      //return undefined;
      res.json({ type: undefined, message: "El codigo ingresado no existe en nuestra base de datos" });
      // Realiza las operaciones adicionales que desees
    }
  } catch (e) {
    // Error al obtener el documento
    console.error("Error al obtener el documento:", error);
    res.json({ type: undefined, message: "El codigo ingresado no existe en nuestra base de datos" });
  }
});

const heineken = functions.https.onRequest(app);

module.exports = {
  heineken,
};
