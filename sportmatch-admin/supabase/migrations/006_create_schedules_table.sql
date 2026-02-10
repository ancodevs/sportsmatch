-- ============================================
-- GESTIÓN DE HORARIOS - SPORTMATCH
-- Solo admin_users pueden gestionar
-- ============================================

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  interval_minutes INTEGER DEFAULT 60,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_court_id ON schedules(court_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_court_day ON schedules(court_id, day_of_week);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin pueden gestionar horarios de sus canchas" ON schedules;
CREATE POLICY "Admin pueden gestionar horarios de sus canchas"
  ON schedules FOR ALL TO authenticated
  USING (
    court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  )
  WITH CHECK (
    court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "Todos pueden leer horarios" ON schedules;
CREATE POLICY "Todos pueden leer horarios"
  ON schedules FOR SELECT USING (true);
