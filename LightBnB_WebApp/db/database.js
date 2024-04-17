const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require("pg");

const pool = new Pool({
  user: "development",
  password: "development",
  host: "localhost",
  database: "lightbnb",
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
    .query(`SELECT * FROM users WHERE users.email = $1`, [email]) // query to return us the user object with the specified email
    .then((result) => {
      console.log(result.rows[0]);

      if (result.rows[0]) { // if result.rows. returns us more than 0
        return result.rows[0]; // return the [0]th result
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
  };
  // let resolvedUser = null;
  // for (const userId in users) {
  //   const user = users[userId];
  //   if (user && user.email.toLowerCase() === email.toLowerCase()) {
  //     resolvedUser = user;
  //   }
  // }
  // return Promise.resolve(resolvedUser);

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(`SELECT * FROM users
            WHERE users.id = $1`, [id])
    .then((result) => {
      // console.log(result.rows[0]);
      if (result.rows[0]) { // if there is a result return the first result (0th)
        return result.rows[0];
      } else { // otherwise return null
        return null;
      }
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
// INPUT: User object
// OUTPUT: Newly created users object
const addUser = function (user) {
  return pool.query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;`, [user.name, user.email, user.password])
  .then((result) => {
    return result.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
    return null;
  })
};
// const userId = Object.keys(users).length + 1; // creates a primary key
// user.id = userId; // gives the new user.id the newly created primary key
// users[userId] = user; // creates a new user object with the new primary key
// return Promise.resolve(user); // return our newly created object 

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */

const getAllReservations = function (guest_id, limit = 10) {
  return pool.query(`SELECT reservations.*, properties.*
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`, [guest_id, limit])
  .then((result) => {
    console.log('getAllReservations:', result);
    return result.rows;
  })
  .catch((err) => {
    console.log(err.message);
    return null;
  })
};
// return getAllProperties(null, 2);
// SELECT reservations.*, properties.*, property_reviews.*
//   FROM reservations
//   JOIN properties ON reservations.property_id = properties.id
//   JOIN property_reviews ON properties.id = property_reviews.property_id
//   WHERE reservations.guest_id = 4
//   GROUP BY properties.id, reservations.id, property_reviews.id
//   ORDER BY reservations.start_date
//   LIMIT 10;`
/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
    // 1
  const { city, owner_id, minimum_price_per_night, maximum_price_per_night, minimum_rating } = options;

  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, AVG(property_reviews.rating) as average_rating
  FROM properties
  JOIN users ON properties.owner_id = users.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  `; // create the start of our query

  // 3
  if (city) { // if options.city is present
    queryParams.push(`%${city}%`); // push %name of city% into queryParams
    queryString += queryParams.length === 1 ? ' WHERE ' : ' AND '; // if queryParams.length is 1 is truthy add 'WHERE', falsy add 'AND'
    queryString += `city LIKE $${queryParams.length}`;
  }

  if (owner_id) {
    queryParams.push(`${owner_id}`);
    queryString += queryParams.length === 1 ? ' WHERE ' : ' AND '; // if queryParams.length is 1 is truthy add 'WHERE', falsy add 'AND'
    queryString += `owner_id = $${queryParams.length}`;
  }
  
  if (minimum_price_per_night && maximum_price_per_night) {
    const minPriceCents = minimum_price_per_night * 100; // database converts dollars to cents so we multiply by 100
    const maxPriceCents = maximum_price_per_night * 100;

    queryParams.push(`${minPriceCents}`);
    queryString += queryParams.length === 1 ? ' WHERE ' : ' AND ';
    queryString += `cost_per_night >= $${queryParams.length}`;

    queryParams.push(`${maxPriceCents}`);
    queryString += queryParams.length === 1 ? ' WHERE ' : ' AND ';
    queryString += `cost_per_night <= $${queryParams.length}`;

  }

  // GROUP BY needs to be before HAVING
  queryString += `
  GROUP BY properties.id
  `;


  if (minimum_rating) {
    queryParams.push(`${minimum_rating}`);
    // queryString += queryParams.length === 1 ? ' WHERE ' : ' AND '; // if queryParams.length is 1 is truthy add 'WHERE', falsy add 'AND'
    queryString += `HAVING AVG(property_reviews.rating) >= $${queryParams.length} `;
  }

  // 4
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // 5
  console.log('getAllProperties Result:', queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows);
};
// `SELECT properties.* , AVG(property_reviews.rating) AS average_rating
//     FROM properties
//     JOIN users
//     ON properties.owner_id = users.id
//     JOIN property_reviews
//     ON users.id = property_reviews.guest_id
//     WHERE city = 'Vancouver'
//     GROUP BY properties.id
//     HAVING AVG(property_reviews.rating) >= 4
//     ORDER BY cost_per_night ASC
//     LIMIT $1;
// return pool.query(`SELECT * FROM properties LIMIT $1`, [limit])
// .then((result) => {
//   console.log(result.rows);
//   return result.rows;
// })
// .catch((err) => {
//   console.log(err.message);
// });

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const { owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces,
          number_of_bathrooms, number_of_bedrooms } = property;

  return pool.query(`INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city,
  province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
   [owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces,
    number_of_bathrooms, number_of_bedrooms])
    .then((result) => {
      console.log('addProperty:',result);
      if (result.rows) {
        return result.rows[0]
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.log(err.message);
      throw err;
    })
};
// const propertyId = Object.keys(properties).length + 1; // 
// property.id = propertyId;
// properties[propertyId] = property;
// return Promise.resolve(property);

 /* 
 INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province,
  post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms) VALUES
  
 */

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
