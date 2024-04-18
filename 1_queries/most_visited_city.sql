-- Select the name of the city and the number of reservations for that city.
-- Get a list of the most visited cities.
-- Order the results from highest number of reservations to lowest number of reservations.
SELECT properties.city AS city, COUNT(reservations.*) AS total_reservations
FROM properties
JOIN reservations
ON properties.id = reservations.property_id
GROUP BY properties.city
ORDER BY total_reservations DESC;