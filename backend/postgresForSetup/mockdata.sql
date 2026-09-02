-- 1. Cleanup
TRUNCATE local_order_service, local_spending_tickets, local_orders, customers, users, local_services, idempotency_keys CASCADE;

-- 2. Services (Price in 1.000 VNĐ)
INSERT INTO local_services (
    service_name, 
    service_unit, 
    is_whole_unit, 
    service_price_per_unit
)
SELECT 
    f.fabric || ' ' || i.item || ' (' || t.treatment || ')',
    u.unit,
    u.unit != 'kg',
    (f.base_price + i.base_price + t.base_price)::int
FROM 
    (VALUES ('Lụa', 50), ('Cotton', 10), ('Len', 40), ('Lanh', 30), ('Da', 150), ('Jean', 15)) AS f(fabric, base_price)
CROSS JOIN 
    (VALUES ('Áo sơ mi', 15), ('Quần tây', 20), ('Váy/Đầm', 45), ('Áo khoác', 55), ('Rèm cửa', 80), ('Chăn ga', 60)) AS i(item, base_price)
CROSS JOIN 
    (VALUES ('Giặt thường', 5), ('Giặt khô', 40), ('Ủi/Là', 10), ('Tẩy vết bẩn', 25), ('Giặt sinh học', 15), ('Giặt tay', 30)) AS t(treatment, base_price)
CROSS JOIN LATERAL (
    SELECT CASE 
        WHEN t.treatment IN ('Giặt khô', 'Giặt tay') THEN 'cái'
        WHEN t.treatment = 'Ủi/Là' THEN 'chiếc'
        ELSE 'kg'
    END AS unit
) u
LIMIT 200;

-- 3. Users (20 Employees)
INSERT INTO users (user_name, user_role, user_phone, password_hash)
SELECT 
    (ARRAY['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Phan', 'Huỳnh', 'Đặng', 'Bùi'])[floor(random() * 10 + 1)] || ' ' || 
    (ARRAY['Anh', 'Bảo', 'Cường', 'Duy', 'Hạnh', 'Khoa', 'Linh', 'Mạnh', 'Nga', 'Sơn', 'Tuấn', 'Vinh', 'Yến', 'Quốc', 'Trang'])[floor(random() * 15 + 1)],
    CASE WHEN i <= 2 THEN 'admin'::user_role_enum ELSE 'employee'::user_role_enum END,
    (ARRAY['090','091','093','094','096','097','098'])[floor(random() * 7 + 1)] 
    || LPAD((floor(random() * 10000000))::text, 7, '0'),
    'hash_secure_' || i
FROM generate_series(1, 20) i;

-- 4. Customers (2000 records)
INSERT INTO customers (customer_name, customer_phone, customer_address, points)
SELECT 
    (ARRAY['Đỗ', 'Hồ', 'Lý', 'Dương', 'Lâm', 'Trịnh', 'Phùng', 'Mai', 'Vương', 'Cao'])[floor(random() * 10 + 1)] || ' ' || 
    (ARRAY['Thanh', 'Hồng', 'Gia', 'Nhật', 'Bích', 'Tấn', 'Ngọc', 'Xuân', 'Trọng', 'Kim'])[floor(random() * 10 + 1)] || ' ' ||
    (ARRAY['Hải', 'Hà', 'Phúc', 'Lộc', 'Thọ', 'Tâm', 'Đức', 'Uyên', 'Vy', 'Nam'])[floor(random() * 10 + 1)],
    -- Valid Vietnamese 10-digit mobile number generation
    (ARRAY['032','033','034','035','036','037','038','039',  -- Viettel
            '070','079','077','076','078',                -- Mobifone
            '083','084','085','081','082','088',          -- Vinaphone
            '056','058','092'])[floor(random() * 21 + 1)]  -- Vietnamobile & 09x
    || LPAD((floor(random() * 10000000))::text, 7, '0'),
    'Hẻm ' || floor(random() * 99 + 1) || ', Đường ' || (ARRAY['3/2', 'Nguyễn Trãi', 'Lê Hồng Phong', 'Điện Biên Phủ', 'Phan Đăng Lưu'])[floor(random() * 5 + 1)] || ', Q.' || (i%12 + 1),
    (random() * 500)::int
FROM generate_series(1, 2000) i;

-- 5 & 6. Orders and Items
ALTER TABLE local_orders DISABLE TRIGGER USER;

WITH customer_pool AS (
    SELECT customer_id, 
    ROW_NUMBER() OVER() as row_num,
    CASE 
        WHEN random() < 0.05 THEN 'VIP'        -- 5% are power users
        WHEN random() < 0.20 THEN 'Regular'    -- 15% are regulars
        ELSE 'Occasional'                      -- 80% are one-offs
    END as tier
    FROM customers
),
order_gen AS (
    SELECT 
        CASE 
            WHEN random() < 0.6 THEN (SELECT customer_id FROM customer_pool WHERE tier = 'VIP' ORDER BY random() LIMIT 1)
            WHEN random() < 0.9 THEN (SELECT customer_id FROM customer_pool WHERE tier = 'Regular' ORDER BY random() LIMIT 1)
            ELSE (SELECT customer_id FROM customer_pool WHERE tier = 'Occasional' ORDER BY random() LIMIT 1)
        END as cid,
        (SELECT user_id FROM users ORDER BY (random() * i) LIMIT 1) as hid1, 
        (SELECT user_id FROM users ORDER BY (random() * i) LIMIT 1) as hid2, 
        -- Distribute statuses organically to maintain business logic consistency
        (ARRAY['pending', 'working', 'completed', 'delivered', 'owed'])[
            CASE 
                WHEN i <= 80000 THEN 4 -- 80% Delivered
                WHEN i <= 90000 THEN 5 -- 10% Owed
                WHEN i <= 94000 THEN 3 -- 4% Completed
                WHEN i <= 98000 THEN 2 -- 4% Working
                ELSE 1                 -- 2% Pending
            END
        ]::order_status_enum as stat,
        -- Generate a roll to cleanly separate prepaid orders across non-owed states (e.g., 30% chance of prepayment)
        (random() > 0.7) as prepay_roll,
        -- Calculate order_start_date here to serve as the structural anchor for other dates
        ((NOW() - INTERVAL '2555 days') + (i * (INTERVAL '2555 days' / 100000)) + (sin(i::float / 10) * INTERVAL '6 hours') - (random() * INTERVAL '3 days')) as base_start_date,
        i
    FROM generate_series(1, 100000) i
)
INSERT INTO local_orders (
    customer_id, handler_id, closed_by, order_status, 
    extra_cost, discount, discount_type, 
    order_start_date, order_end_date, planned_pickup_date, owed_due_date,
    payment_method, is_prepaid, paid_at,
    total_service_cost
)
SELECT 
    cid,
    hid1,
    -- closed_by: Must be null unless status is 'delivered'
    CASE WHEN stat = 'delivered' THEN hid2 ELSE NULL END,
    stat,
    (CASE WHEN random() > 0.8 THEN (random() * 40)::int ELSE 0 END),
    (CASE WHEN random() > 0.9 THEN (random() * 15)::int ELSE 0 END),
    (ARRAY['percentage', 'fixed'])[floor(random() * 2 + 1)]::order_discount_type_enum,
    
    -- Chronology core times safely stacked
    base_start_date, -- order_start_date
    CASE WHEN stat = 'delivered' THEN base_start_date + (random() * INTERVAL '2 days' + INTERVAL '1 hour') ELSE NULL END, -- order_end_date
    base_start_date + (random() * INTERVAL '4 days' + INTERVAL '12 hours'), -- planned_pickup_date
    CASE WHEN stat = 'owed' THEN base_start_date + INTERVAL '30 days' ELSE NULL END, -- owed_due_date
    
    -- payment_method logic
    CASE 
        WHEN stat = 'owed' THEN NULL
        WHEN stat = 'delivered' OR prepay_roll = TRUE THEN (ARRAY['cash', 'bank_transfer'])[floor(random() * 2 + 1)]::payment_method_enum
        ELSE NULL
    END,

    -- is_prepaid logic
    CASE 
        WHEN stat = 'owed' THEN FALSE
        ELSE prepay_roll
    END,

    -- paid_at logic
    CASE 
        WHEN stat = 'owed' THEN NULL
        -- If it's prepaid, payment happened exactly at order creation time
        WHEN prepay_roll = TRUE THEN base_start_date 
        -- If not prepaid but delivered, payment happened somewhere between start and end date
        WHEN stat = 'delivered' THEN base_start_date + (random() * INTERVAL '12 hours') 
        ELSE NULL
    END,
    
    100000 -- Temporary structural pivot placeholder (cannot be 0 due to constraints)
FROM order_gen;

-- Primary Service (1 for every order)
INSERT INTO local_order_service (order_id, service_id, number_of_unit, line_item_cost)
SELECT 
    o.order_id,
    s.service_id,
    u.units,
    (s.service_price_per_unit * u.units)::int
FROM local_orders o
CROSS JOIN LATERAL (
    SELECT service_id, service_price_per_unit FROM local_services WHERE is_deleted = FALSE ORDER BY random() LIMIT 1
) s
CROSS JOIN LATERAL (
    SELECT (random() * 5 + 1)::int as units
) u;

-- Secondary Service (Added noise: 40% of orders get a second item)
INSERT INTO local_order_service (order_id, service_id, number_of_unit, line_item_cost)
SELECT 
    o.order_id,
    s.service_id,
    u.units,
    (s.service_price_per_unit * u.units)::int
FROM (SELECT order_id FROM local_orders ORDER BY random() LIMIT 40000) o
CROSS JOIN LATERAL (
    SELECT service_id, service_price_per_unit FROM local_services WHERE is_deleted = FALSE ORDER BY random() LIMIT 1
) s
CROSS JOIN LATERAL (
    SELECT (random() * 3 + 1)::int as units
) u
ON CONFLICT (order_id, service_id) DO NOTHING;

-- Aggregation Step: Backfill total_service_cost to fit the accurate child-table values
WITH item_aggregates AS (
    SELECT order_id, SUM(line_item_cost) as true_service_cost
    FROM local_order_service
    GROUP BY order_id
)
UPDATE local_orders o
SET total_service_cost = ia.true_service_cost
FROM item_aggregates ia
WHERE o.order_id = ia.order_id;


-- 7. Spending Tickets
INSERT INTO local_spending_tickets (creator_id, ticket_date, amount, is_expense, reason, created_at, updated_at)
WITH user_weights AS (
    SELECT 
        user_id,
        CASE 
            WHEN row_number() OVER (ORDER BY user_id) <= 8 THEN 0.5  
            WHEN row_number() OVER (ORDER BY user_id) <= 16 THEN 0.3  
            ELSE 0.2                                                
        END as weight_class
    FROM users
    WHERE is_deleted = FALSE
),
ticket_series AS (
    SELECT 
        i,
        (NOW() - INTERVAL '2555 days') + (i * (INTERVAL '2555 days' / 5000)) + (random() * INTERVAL '24 hours') AS ticket_time
    FROM generate_series(1, 5000) i
)
SELECT 
    (SELECT user_id 
     FROM user_weights 
     ORDER BY (random() / weight_class) 
     LIMIT 1),
    ticket_time,
    (CASE WHEN random() > 0.1 THEN (random() * 500 + 50)::int ELSE (random() * 5000 + 1000)::int END),
    (random() > 0.05),
    (ARRAY['Tiền điện', 'Tiền nước', 'Xà phòng', 'Móc treo', 'Thuê mặt bằng', 'Cơm trưa', 'Bảo trì máy', 'Mực in', 'Túi nilon'])[floor(random() * 9 + 1)],
    ticket_time + (random() * INTERVAL '12 hours' + INTERVAL '1 hour'),
    ticket_time + (random() * INTERVAL '12 hours' + INTERVAL '1 hour')
FROM ticket_series;

-- 8. Soft Deletes
UPDATE customers SET is_deleted = TRUE WHERE customer_id IN (SELECT customer_id FROM customers ORDER BY random() LIMIT 20);
UPDATE users SET is_deleted = TRUE WHERE user_role = 'employee' AND user_id IN (SELECT user_id FROM users ORDER BY random() LIMIT 2);

UPDATE local_orders SET is_deleted = TRUE WHERE order_id IN (SELECT order_id FROM local_orders ORDER BY random() LIMIT 3000);

UPDATE local_spending_tickets SET is_deleted = TRUE WHERE ticket_id IN (SELECT ticket_id FROM local_spending_tickets ORDER BY random() LIMIT 250);
UPDATE local_services SET is_deleted = TRUE WHERE service_id IN (SELECT service_id FROM local_services ORDER BY random() LIMIT 20);

ALTER TABLE local_orders ENABLE TRIGGER USER;

-- 9. Refresh
ANALYZE local_order_service, local_spending_tickets, local_orders, customers, users, local_services;