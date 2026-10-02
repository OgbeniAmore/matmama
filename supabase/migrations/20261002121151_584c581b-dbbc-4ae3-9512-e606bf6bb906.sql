CREATE POLICY "Requester can delete own pending transfer request"
ON public.transfer_requests
FOR DELETE
TO authenticated
USING (requested_by = auth.uid() AND status = 'pending');