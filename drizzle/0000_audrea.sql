CREATE TABLE reservations (id TEXT PRIMARY KEY NOT NULL, owner TEXT NOT NULL, room TEXT NOT NULL, unit INTEGER NOT NULL, arrival TEXT NOT NULL, departure TEXT NOT NULL, guests INTEGER NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, notes TEXT NOT NULL, total INTEGER NOT NULL, paid INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'Confirmed', payment TEXT NOT NULL, created TEXT NOT NULL, history TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX reservation_owner ON reservations(owner);
--> statement-breakpoint
CREATE TABLE occupied_nights (owner TEXT NOT NULL, room TEXT NOT NULL, unit INTEGER NOT NULL, day TEXT NOT NULL, booking TEXT NOT NULL, PRIMARY KEY(owner,room,unit,day));
--> statement-breakpoint
CREATE TABLE profiles (owner TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Resort manager', notifications INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
CREATE TABLE room_state (owner TEXT NOT NULL, room TEXT NOT NULL, unit INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'Ready', PRIMARY KEY(owner,room,unit));
