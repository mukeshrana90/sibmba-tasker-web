/* Fictional Harare cast and units for the client videos. Emails are @yopmail.com; messaging is mocked so nothing is sent. */
const PW = "Simba@2026";
const HARARE = { latitude: -17.8292, longitude: 31.0522 };
module.exports = {
  PW, HARARE,
  admin: { email: "admin.simba@yopmail.com", password: "Simba@2026" },
  owner: { name: "Tatenda Mutasa", company: "Mutasa Haulage & Plant Hire", email: "tatenda.mutasa@yopmail.com", phone: "772415836", base: "Msasa, Harare" },
  op1: { name: "Farai Chikore", email: "farai.chikore@yopmail.com", phone: "773628194", licence: "ZW-DL-284613", face: "op1" },
  op2: { name: "Blessing Ncube", email: "blessing.ncube@yopmail.com", phone: "784250917", licence: "ZW-DL-517902", face: "op2" },
  customer: { name: "Rudo Makoni", email: "rudo.makoni@yopmail.com", phone: "719384052" },
  hino: { name: "Hino 500 Tipper", plate: "AEZ4821", tons: 15, make: "Hino", model: "500 Ranger", year: 2019, photos: ["hino-1.jpg", "hino-2.jpg"], place: "Msasa, Harare" },
  seddon: { name: "Seddon Atkinson Strato", plate: "AFC2290", tons: 30, make: "Seddon Atkinson", model: "Strato 325", year: 2016, photos: ["seddon-1.jpg", "seddon-2.jpg"], place: "Southerton, Harare" },
  excavator: { name: "CAT 352F Excavator", make: "Caterpillar", model: "352F", photos: ["cat-1.jpg", "cat-2.jpg"], place: "Workington, Harare", dayRate: "350" },
  job: { pickup: "Msasa, Harare", drop: "Chitungwiza", goods: "Cement, 200 bags", weight: "10", vehicle: "10 ton", price: "300", note: "Please call 30 minutes before you arrive." },
  hire: { place: "Borrowdale, Harare", note: "Foundation trenches for a warehouse in Borrowdale, about 4 days.", budget: "350" },
};
