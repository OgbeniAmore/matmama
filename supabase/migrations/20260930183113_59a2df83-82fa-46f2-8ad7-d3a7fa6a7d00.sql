CREATE OR REPLACE FUNCTION public._can_act_on_client(_client_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(),'system_admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = _client_id AND c.account_id = public.get_user_account_id(auth.uid()))
    OR public.is_client_shared_with_user(_client_id, auth.uid()))
$$;

CREATE OR REPLACE FUNCTION public.register_child(_mother_id text, _child_name text, _dob date)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _m record; _id text; _today date := (now() AT TIME ZONE 'Africa/Lagos')::date;
BEGIN
  IF NOT public._can_act_on_client(_mother_id) THEN
    RAISE EXCEPTION 'Permission denied for this client' USING ERRCODE='42501';
  END IF;
  IF _child_name IS NULL OR length(trim(_child_name)) = 0 THEN
    RAISE EXCEPTION 'Baby name is required' USING ERRCODE='22023';
  END IF;
  SELECT * INTO _m FROM public.clients WHERE id = _mother_id;
  LOOP
    _id := 'RXM-' || to_char(now() AT TIME ZONE 'Africa/Lagos','YYMMDD') || '-' || lpad(floor(random()*10000)::int::text,4,'0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.clients WHERE id = _id);
  END LOOP;
  INSERT INTO public.clients (id, name, child_name, child_dob, service, status, due_date, contact, address,
    assigned_to, preferred_channel, account_id, facility_id, mother_client_id)
  VALUES (_id, _m.name, trim(_child_name), _dob, 'Routine Immunization', 'On Track', _dob::timestamptz,
    _m.contact, _m.address, _m.assigned_to, COALESCE(_m.preferred_channel,'sms'), _m.account_id, _m.facility_id, _mother_id);
  INSERT INTO public.immunization_records (client_id, vaccine_name, due_date, status, age_weeks, account_id)
  SELECT _id, e.vaccine_name, _dob + e.age_weeks*7,
         CASE WHEN _dob + e.age_weeks*7 < _today THEN 'Missed' ELSE 'Pending' END, e.age_weeks, _m.account_id
  FROM public.epi_schedule e;
  PERFORM public.resync_client_status(_id);
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.record_delivery(_mother_id text, _pregnancy integer, _date date,
  _place text, _mode text, _outcome text, _notes text, _baby_names text[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _m record; _did uuid; _n text;
BEGIN
  IF NOT public._can_act_on_client(_mother_id) THEN
    RAISE EXCEPTION 'Permission denied for this client' USING ERRCODE='42501';
  END IF;
  SELECT * INTO _m FROM public.clients WHERE id = _mother_id;
  IF _outcome = 'Live birth' AND (coalesce(array_length(_baby_names,1),0) = 0
     OR EXISTS (SELECT 1 FROM unnest(_baby_names) x WHERE x IS NULL OR length(trim(x)) = 0)) THEN
    RAISE EXCEPTION 'Each baby''s name is required' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.deliveries (mother_client_id, pregnancy_number, delivery_date, place, delivery_mode,
    outcome, number_of_babies, notes, recorded_by, account_id, facility_id)
  VALUES (_mother_id, _pregnancy, _date, _place, _mode, _outcome,
    GREATEST(coalesce(array_length(_baby_names,1),1),1), NULLIF(trim(_notes),''), auth.uid(), _m.account_id, _m.facility_id)
  RETURNING id INTO _did;
  IF _outcome = 'Live birth' THEN
    FOREACH _n IN ARRAY _baby_names LOOP
      PERFORM public.register_child(_mother_id, _n, _date);
    END LOOP;
  END IF;
  PERFORM public.resync_client_status(_mother_id);
  RETURN _did;
END $$;

REVOKE ALL ON FUNCTION public._can_act_on_client(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.register_child(text,text,date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_delivery(text,integer,date,text,text,text,text,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_child(text,text,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_delivery(text,integer,date,text,text,text,text,text[]) TO authenticated;