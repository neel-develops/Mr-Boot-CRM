-- Find orders that have no invoice attached
SELECT o.id, o."createdAt", o.price, o.status,
       c."firstName", c."lastName", c.phone
FROM orders o
JOIN customers c ON c.id = o."customerId"
LEFT JOIN invoices i ON i."orderId" = o.id
WHERE i.id IS NULL
ORDER BY o."createdAt" DESC
LIMIT 20;
