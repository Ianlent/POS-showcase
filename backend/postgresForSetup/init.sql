CREATE SCHEMA IF NOT EXISTS public;

CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE OR REPLACE FUNCTION public.f_unaccent(text)
  RETURNS text AS
$func$
  SELECT public.unaccent('public.unaccent', $1);
$func$
LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- Enum types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('employee', 'manager', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'operation_type_enum') THEN
        CREATE TYPE operation_type_enum AS ENUM ('get', 'patch', 'put', 'post', 'delete');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_enum') THEN
        CREATE TYPE user_status_enum AS ENUM ('active', 'suspended');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_enum') THEN
        CREATE TYPE order_status_enum AS ENUM ('pending', 'working', 'completed', 'delivered', 'owed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE payment_method_enum AS ENUM ('cash', 'bank_transfer');
    END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_discount_type_enum') THEN
		CREATE TYPE order_discount_type_enum AS ENUM ('fixed', 'percentage');
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'idempotency_status') THEN
        CREATE TYPE idempotency_status AS ENUM ('started', 'completed', 'failed');
    END IF;
END $$;

-- Tables with audit columns & soft-deletes

-- Customers
CREATE TABLE IF NOT EXISTS customers (
	customer_id				UUID PRIMARY KEY DEFAULT uuidv7(),
	customer_name			VARCHAR(50),
	customer_phone			VARCHAR(20),
	customer_address 		VARCHAR(100),
	points 					INT NOT NULL DEFAULT 0,
	is_deleted 				BOOLEAN NOT NULL DEFAULT FALSE,
	created_at 				TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at 				TIMESTAMPTZ NOT NULL DEFAULT now(),
	customer_name_search	VARCHAR(50) GENERATED ALWAYS AS (lower(f_unaccent(customer_name))) STORED,

    CONSTRAINT unique_customer_phone UNIQUE (customer_phone),
    CONSTRAINT check_min_points CHECK (points >= 0)
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    user_id				UUID PRIMARY KEY DEFAULT uuidv7(),
    user_name			VARCHAR(50),
    user_phone			VARCHAR(20),
    user_role			user_role_enum NOT NULL DEFAULT 'employee',
    user_status			user_status_enum NOT NULL DEFAULT 'active',
    password_hash		VARCHAR(100) NOT NULL,
    is_deleted			BOOLEAN NOT NULL DEFAULT FALSE,
    created_at			TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at			TIMESTAMPTZ NOT NULL DEFAULT now(),
	user_name_search	VARCHAR(50) GENERATED ALWAYS AS (lower(f_unaccent(user_name))) STORED,

    CONSTRAINT unique_user_phone UNIQUE (user_phone)
);
-- Security --
-- Authentication
CREATE TABLE IF NOT EXISTS refresh_token(
    token_id    UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id     UUID NOT NULl,
    jwt_token   VARCHAR(2048) NOT NULL
);

-- RBAC
CREATE TABLE IF NOT EXISTS roles(
    role_id             UUID PRIMARY KEY DEFAULT uuidv7(),
    role_name           VARCHAR(50) NOT NULL,
    role_desc           VARCHAR(250),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions(
    permission_id       UUID PRIMARY KEY DEFAULT uuidv7(),
    permission_name     VARCHAR(50) NOT NULL,
    permission_desc     VARCHAR(250),
    allowed_endpoint    VARCHAR(250) NOT NULL,
    allowed_operation   operation_type_enum NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users_roles(
    user_id     UUID NOT NULL,
    role_id     UUID NOT NULL,

    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_role_users FOREIGN KEY (role_id)
        REFERENCES roles (role_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS roles_permissions(
    role_id         UUID NOT NULL,
    permission_id   UUID NOT NULL,

    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions FOREIGN KEY (role_id)
        REFERENCES roles (role_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_permissions FOREIGN KEY (permission_id)
        REFERENCES permissions (permission_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Services
CREATE TABLE IF NOT EXISTS local_services (
    service_id             	UUID PRIMARY KEY DEFAULT uuidv7(),
    service_name			VARCHAR(50) NOT NULL,
    service_unit           	VARCHAR(20) NOT NULL,
	is_whole_unit			BOOLEAN NOT NULL DEFAULT TRUE,
    service_price_per_unit 	INT NOT NULL,
    is_deleted             	BOOLEAN NOT NULL DEFAULT FALSE,
    created_at             	TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             	TIMESTAMPTZ NOT NULL DEFAULT now(),
	service_name_search		VARCHAR(50) GENERATED ALWAYS AS (f_unaccent(lower(service_name))) STORED,

    CONSTRAINT check_min_service_price CHECK (service_price_per_unit > 0)
);


-- Orders
CREATE TABLE IF NOT EXISTS local_orders (
    order_id				UUID PRIMARY KEY DEFAULT uuidv7(),

    -- Subjects
    customer_id				UUID NOT NULL,
    handler_id				UUID NOT NULL,
	closed_by				UUID DEFAULT NULL,

    -- State
    order_status			order_status_enum NOT NULL DEFAULT 'pending',

	order_start_date		TIMESTAMPTZ NOT NULL DEFAULT now(),
	order_end_date  		TIMESTAMPTZ DEFAULT NULL,
    planned_pickup_date     TIMESTAMPTZ DEFAULT NULL,
    owed_due_date           TIMESTAMPTZ DEFAULT NULL,

    -- meta data
    payment_method          payment_method_enum DEFAULT NULL,
    is_prepaid				BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at					TIMESTAMPTZ DEFAULT NULL,

	extra_cost				INT NOT NULL DEFAULT 0,

	discount 				INT NOT NULL DEFAULT 0,
	discount_type			order_discount_type_enum NOT NULL DEFAULT 'percentage',
    
	order_note				VARCHAR(1000),

	total_service_cost		INT NOT NULL,
	

    -- GENERATED COLUMN
	total_cost				INT GENERATED ALWAYS AS (
								CASE
									WHEN discount_type = 'percentage' THEN ROUND((total_service_cost + extra_cost) * (100.0 - discount) / 100.0)
									ELSE (total_service_cost + extra_cost - discount)
								END
							) STORED,


    is_deleted				BOOLEAN NOT NULL DEFAULT FALSE,
    created_at				TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at				TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- foreign keys
    CONSTRAINT fk_customer FOREIGN KEY (customer_id)
        REFERENCES customers (customer_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_handler FOREIGN KEY (handler_id)
        REFERENCES users (user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT fk_closed_by FOREIGN KEY (closed_by)
		REFERENCES users (user_id) ON DELETE RESTRICT ON UPDATE CASCADE,

    -- integrity
    CONSTRAINT check_min_extra_cost CHECK (extra_cost >= 0),
    CONSTRAINT check_total_service_cost CHECK (total_service_cost > 0),

    -- Business Logic: Discount Validation
    CONSTRAINT check_discount_bounds CHECK (
        (discount_type = 'percentage' AND discount BETWEEN 0 AND 100) OR
        (discount_type = 'fixed' AND discount >= 0)
    ),

    -- Business Logic: Prevent prepaid order not having timestampt
	CONSTRAINT check_order_prepaid CHECK (
		CASE
			WHEN is_prepaid = TRUE THEN paid_at IS NOT NULL AND payment_method IS NOT NULL
			ELSE TRUE
		END
	),
    -- Business Logic: Status-Based Nullability for metadata based on order_status
    CONSTRAINT check_order_status CHECK (
        CASE
            WHEN order_status = 'delivered'
                THEN order_end_date IS NOT NULL AND 
                paid_at IS NOT NULL AND 
                payment_method IS NOT NULL AND 
                closed_by IS NOT NULL
            WHEN order_status = 'owed' 
                THEN paid_at IS NULL AND 
                is_prepaid IS FALSE AND 
                payment_method IS NULL AND 
                closed_by IS NULL AND 
                order_end_date IS NULL AND 
                owed_due_date IS NOT NULL
            ELSE closed_by IS NULL AND order_end_date IS NULL
        END
    ),

    -- Business Logic: Chronology
    CONSTRAINT check_date_order CHECK (
        order_end_date IS NULL OR (order_end_date > order_start_date)
    ),

    CONSTRAINT check_date_pickup CHECK (
        planned_pickup_date IS NULL OR (planned_pickup_date > order_start_date)
    ),

    CONSTRAINT check_date_owed CHECK (
        owed_due_date IS NULL OR (owed_due_date > order_start_date)
    ),

    -- Final Cost Safety
    CONSTRAINT check_positive_total CHECK (total_cost > 0)
);

-- Order_Service (join table)
CREATE TABLE IF NOT EXISTS local_order_service (
    order_id		UUID NOT NULL,
    service_id		UUID NOT NULL,
	line_item_cost	INT NOT NULL,
    number_of_unit	NUMERIC(3, 1) NOT NULL,
	is_deleted		BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (order_id, service_id),
    CONSTRAINT fk_order FOREIGN KEY (order_id)
        REFERENCES local_orders (order_id) ON DELETE CASCADE ON UPDATE CASCADE
		DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_service FOREIGN KEY (service_id)
        REFERENCES local_services (service_id) ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT check_min_line_item_cost CHECK (line_item_cost > 0),
    CONSTRAINT check_min_line_item_unit_number CHECK (number_of_unit > 0)
);

-- Expenses
CREATE TABLE IF NOT EXISTS local_spending_tickets (
    ticket_id				UUID PRIMARY KEY DEFAULT uuidv7(),
	creator_id				UUID NOT NULL,
	ticket_date				TIMESTAMPTZ NOT NULL DEFAULT now(),
    amount					INT NOT NULL,
    is_expense				BOOLEAN NOT NULL DEFAULT TRUE,
    reason					VARCHAR(250),
    is_deleted				BOOLEAN NOT NULL DEFAULT FALSE,
    created_at				TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at				TIMESTAMPTZ NOT NULL DEFAULT now(),

	CONSTRAINT fk_creator FOREIGN KEY (creator_id)
		REFERENCES users (user_id) ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT check_min_ticket_amount CHECK (amount > 0)
);

-- Idempotency keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
	idempotency_key				UUID NOT NULL,
	user_id						UUID NOT NULL,

	-- hash of the request body + method + path ensure the intent hasn't changed
	request_hash				TEXT NOT NULL,

	status idempotency_status 	DEFAULT 'started' NOT NULL,

	-- cached response details
	response_code 				INT,
	response_body				JSONB,

	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    locked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, idempotency_key)
);

--================================================== TRIGGERS ============================================--

------------------------Trigger function to ensure order has at least one service --------------------------
CREATE OR REPLACE FUNCTION enforce_order_has_service() 
RETURNS TRIGGER AS $$
DECLARE
    target_order_id UUID;
BEGIN
    target_order_id := NEW.order_id;
    IF NOT EXISTS (SELECT 1 FROM local_order_service WHERE order_id = target_order_id) THEN
        RAISE EXCEPTION 'Transaction failed: Order % must have at least one service.', target_order_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_service_exists ON local_orders;

CREATE CONSTRAINT TRIGGER trg_ensure_service_exists
AFTER INSERT ON local_orders
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_order_has_service();

-----------------Trigger function to set paid_at when order is marked as prepaid(before trigger) --------------
CREATE OR REPLACE FUNCTION set_paid_at_for_prepaid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_prepaid = true THEN
        NEW.paid_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_paid_at_prepaid ON local_orders;
CREATE TRIGGER trg_set_paid_at_prepaid
BEFORE UPDATE ON local_orders
FOR EACH ROW
EXECUTE FUNCTION set_paid_at_for_prepaid();

-- Trigger function to tombstone local_order_service
CREATE OR REPLACE FUNCTION tombstone_order_service()
RETURNS TRIGGER AS $$
DECLARE 
	target_order_id UUID;
	is_deleted BOOLEAN;
BEGIN
        UPDATE local_order_service
        SET is_deleted = NEW.is_deleted
        WHERE order_id = NEW.order_id;
		RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tombstone_order_service ON local_orders;
CREATE TRIGGER trg_tombstone_order_service
AFTER UPDATE OF is_deleted ON local_orders
FOR EACH ROW
EXECUTE FUNCTION tombstone_order_service();

------------------------------------Trigger function to maintain updated_at ----------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply "Self-Update" trigger to all main tables
DO $$ 
DECLARE
    t text;
    tables_to_audit text[] := ARRAY['customers', 'users', 'local_services', 'local_orders', 'local_spending_tickets'];
BEGIN
    FOREACH t IN ARRAY tables_to_audit LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON %I', t, t);
        EXECUTE format('
            CREATE TRIGGER trg_%I_updated
            BEFORE UPDATE ON %I
            FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
    END LOOP;
END $$;

----------------------------Trigger function to notify backend of changes done to db ---------------------------------
CREATE OR REPLACE FUNCTION notify_table_change()
RETURNS trigger AS $$
DECLARE
  payload json;
  row_id text;
  current_sender text;
BEGIN
    -- Extract primary key dynamically based on table
    CASE TG_TABLE_NAME
        WHEN 'customers'                THEN row_id := COALESCE(NEW.customer_id::text, OLD.customer_id::text);
        WHEN 'users'                    THEN row_id := COALESCE(NEW.user_id::text, OLD.user_id::text);
        WHEN 'local_services'           THEN row_id := COALESCE(NEW.service_id::text, OLD.service_id::text);
        WHEN 'local_orders'             THEN row_id := COALESCE(NEW.order_id::text, OLD.order_id::text);
        WHEN 'local_spending_tickets'   THEN row_id := COALESCE(NEW.ticket_id::text, OLD.ticket_id::text);
        ELSE                            row_id := 'unknown';
    END CASE;

    current_sender := current_setting('app.current_client_id', true);

    -- Build payload
    payload := json_build_object(
        'table', TG_TABLE_NAME,
        'action', TG_OP,
        'row_id', row_id,
        'senderId', current_sender
    );

    -- Broadcast to channel 'db_changes'
    PERFORM pg_notify('db_changes', payload::text);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply "changed " trigger to all main tables
DO $$ 
DECLARE
    t text;
    tables_to_audit text[] := ARRAY['customers', 'users', 'local_services', 'local_orders', 'local_spending_tickets'];
BEGIN
    FOREACH t IN ARRAY tables_to_audit LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_changed ON %I', t, t);
        EXECUTE format('
            CREATE CONSTRAINT TRIGGER trg_%I_changed
            AFTER INSERT OR UPDATE ON %I
            DEFERRABLE INITIALLY DEFERRED
            FOR EACH ROW EXECUTE FUNCTION notify_table_change()', t, t);
    END LOOP;
END $$;

-----------------------------Trigger function to make order_id in local_order_service immutable -----------------------
CREATE OR REPLACE FUNCTION enforce_order_id_immutable()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_id <> OLD.order_id THEN
        RAISE EXCEPTION 'Column "order_id" is immutable and cannot be changed.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-----------------------Trigger functions to update order table service cost when a line item is changed ----------------
CREATE OR REPLACE FUNCTION update_order_total_service_cost()
RETURNS TRIGGER AS $$
DECLARE
    target_id UUID := NEW.order_id;
    new_total INT;
BEGIN
    SELECT COALESCE(SUM(line_item_cost), 0)
    INTO new_total
    FROM local_order_service
    WHERE order_id = target_id;

    -- Update the parent order
    UPDATE local_orders
    SET total_service_cost = new_total
    WHERE order_id = target_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_order_total_update ON local_order_service;
DROP TRIGGER IF EXISTS trg_recalc_order_total_insert ON local_order_service;

CREATE TRIGGER trg_recalc_order_total_update
AFTER UPDATE ON local_order_service
FOR EACH ROW
WHEN (NEW.is_deleted = OLD.is_deleted)
-- only trigger when no changes to deletion status is detected
EXECUTE FUNCTION update_order_total_service_cost();

CREATE TRIGGER trg_recalc_order_total_insert
AFTER INSERT ON local_order_service
FOR EACH ROW
EXECUTE FUNCTION update_order_total_service_cost();

-----------------------------------Trigger functions for soft deleting users and customers ------------------------
CREATE OR REPLACE FUNCTION soft_delete_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_name := NULL;
  NEW.user_phone := NULL;
  NEW.user_status := 'suspended';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION soft_delete_customer()
RETURNS TRIGGER AS $$
BEGIN
  NEW.customer_name := NULL;
  NEW.customer_phone := NULL;
  NEW.customer_address := NULL;
  NEW.points := 0;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger for soft delete
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_soft_deleted'
	) THEN
		CREATE TRIGGER trg_user_soft_deleted
			BEFORE UPDATE ON users
			FOR EACH ROW
			WHEN (NEW.is_deleted IS TRUE AND OLD.is_deleted IS FALSE)
			EXECUTE FUNCTION soft_delete_user();
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger WHERE tgname = 'trg_customer_soft_deleted'
	) THEN
		CREATE TRIGGER trg_customer_soft_deleted
			BEFORE UPDATE ON customers
			FOR EACH ROW	
			WHEN (NEW.is_deleted IS TRUE AND OLD.is_deleted IS FALSE)
			EXECUTE FUNCTION soft_delete_customer();
	END IF;
END $$;

------------------------------------Trigger functions for hard delete(clean up) ---------------------------------
CREATE OR REPLACE FUNCTION enforce_soft_delete_before_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the row being deleted has is_deleted set to TRUE
    IF OLD.is_deleted IS NOT TRUE THEN
        RAISE EXCEPTION 'Hard delete denied: Row must be soft-deleted (is_deleted = TRUE) first. (ID: %)', OLD.order_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- For Orders
DROP TRIGGER IF EXISTS trg_protect_orders ON local_orders;

CREATE TRIGGER trg_protect_orders
BEFORE DELETE ON local_orders
FOR EACH ROW
EXECUTE FUNCTION enforce_soft_delete_before_hard_delete();

-- For Order Services
DROP TRIGGER IF EXISTS trg_protect_order_services ON local_order_service;

CREATE TRIGGER trg_protect_order_services
BEFORE DELETE ON local_order_service
FOR EACH ROW
EXECUTE FUNCTION enforce_soft_delete_before_hard_delete();



--==============================================INDEXES================================================--

CREATE INDEX IF NOT EXISTS idx_idempotency_created_at ON idempotency_keys (created_at);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_user_phone_role ON users(user_phone text_pattern_ops, user_role) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_users_name_vi ON users(user_name COLLATE "vi-VN-x-icu" ASC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_users_user_name_trgm ON users USING gin (user_name_search gin_trgm_ops) WHERE is_deleted = FALSE;

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_service_name_vi ON local_services(service_name COLLATE "vi-VN-x-icu" ASC, service_id ASC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_services_service_name_trgm ON local_services USING gin (service_name_search gin_trgm_ops) WHERE is_deleted = FALSE;

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_customer_phone ON customers(customer_phone COLLATE "C" ASC, customer_id ASC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_customers_name_vi ON customers(customer_name COLLATE "vi-VN-x-icu" ASC, customer_id ASC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_customers_customer_name ON customers USING gin (customer_name_search gin_trgm_ops) WHERE is_deleted = FALSE;

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_creator_id ON local_spending_tickets(creator_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_spendings_ticket_date ON local_spending_tickets(ticket_date DESC, ticket_id DESC) WHERE is_deleted = FALSE;

-- Orders and order_service Indexes
CREATE INDEX IF NOT EXISTS idx_orders_date_uuid_composite ON local_orders (order_start_date DESC, order_id DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_orders_finished_date_uuid_composite ON local_orders (order_end_date DESC, order_id DESC) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON local_orders (customer_id, order_start_date DESC, order_id DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_orders_handler_id ON local_orders (handler_id, order_start_date DESC, order_id DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_orders_closer_id ON local_orders (closed_by, order_start_date DESC, order_id DESC) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_active_status_nav ON local_orders (order_status, planned_pickup_date ASC NULLS LAST, order_id ASC) WHERE is_deleted = FALSE AND order_status != 'delivered' AND order_status != 'owed';
CREATE INDEX IF NOT EXISTS idx_orders_owed ON local_orders (customer_id, owed_due_date ASC, order_id ASC) INCLUDE(total_cost) WHERE is_deleted = FALSE AND order_status = 'owed';

CREATE INDEX IF NOT EXISTS idx_order_service_service_id ON local_order_service (service_id) INCLUDE (number_of_unit) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_order_service_lookup ON local_order_service (order_id) INCLUDE (service_id, line_item_cost) WHERE is_deleted = FALSE;
