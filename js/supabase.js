/* =============================================
   SHADEN — Cliente Supabase
   ============================================= */

const SUPABASE_URL  = 'https://hgjjdwtiufzheokzuuon.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnampkd3RpdWZ6aGVva3p1dW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTExNjIsImV4cCI6MjEwNjg4NzE2Mn0.1ToWD0qkE5he-MKIbwU8L0ek1cl0XOG3ulowL7WUpv0';

/* Carga el SDK de Supabase desde CDN y expone el cliente global */
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);
