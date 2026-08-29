const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
supabase.from("train_history").select("*").limit(1).then(({ data, error }) => {
    if (error) console.error(error);
    else console.log("Columns:", Object.keys(data[0] || {}));
    process.exit(0);
});
