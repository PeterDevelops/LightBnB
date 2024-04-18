const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require("pg");

const pool = new Pool({
  user: "development",
  password: "development",
  host: "localhost",
  database: "lightbnb",
});

// Users
/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
    .query(`
    SELECT * FROM users 
    WHERE users.email = $1`, [email]) // query to return us the user object with the specified email
    .then((result) => {
      return result.rows[0]; // return the first result
    })
    .catch((err) => {
      console.log(err.message);
      throw new ERROR('No user with that email')
    });
  };

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(`
    SELECT * FROM users 
    WHERE users.id = $1`, [id])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
      throw new ERROR('Id does not exist')
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */

const addUser = function (user) {
  return pool.query(`
  INSERT INTO users (name, email, password) VALUES
  ($1, $2, $3) RETURNING *;`, [user.name, user.email, user.password])
  .then((result) => {
    return result.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
    return null;
  })
};

/// Reservations
/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */

const getAllReservations = function (guest_id, limit = 10) {
  return pool.query(`
  SELECT reservations.*, properties.*
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`, [guest_id, limit])
  .then((result) => {
    return result.rows;
  })
  .catch((err) => {
    console.log(err.message);
    return null;
  })
};

/// Properties
/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {

  const { city, owner_id, minimum_price_per_night, maximum_price_per_night, minimum_rating } = options;

  const queryParams = [];

  let queryString = `
  SELECT properties.*, AVG(property_reviews.rating) as average_rating
  FROM properties
  JOIN users ON properties.owner_id = users.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  `; // create the start of our query

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
    queryString += `HAVING AVG(property_reviews.rating) >= $${queryParams.length} `;
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  return pool.query(queryString, queryParams).then((res) => res.rows);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const { owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces,
          number_of_bathrooms, number_of_bedrooms } = property;

  return pool.query(`
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city,
  province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *`, [owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces,
  number_of_bathrooms, number_of_bedrooms])
    .then((result) => {
      console.log('addProperty Result:',result)
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
      throw new Error('Failed to add property');
    })
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
