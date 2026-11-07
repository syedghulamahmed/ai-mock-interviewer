const SYSTEM = "You are a rigorous but constructive technical interviewer and career coach. Be fair, specific, role-aware, and concise. Never invent facts about the candidate. Return valid JSON only.";
function send(res, status, body) { res.status(status).setHeader("Content-Type","application/json"); return res.end(JSON.stringify(body)); }
async function askOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured in the Vercel project.");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST", headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:process.env.OPENAI_MODEL || "gpt-4o-mini",temperature:0.5,response_format:{type:"json_object"},messages:[{role:"system",content:SYSTEM},{role:"user",content:prompt}]})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "AI provider request failed.");
  const content=data.choices?.[0]?.message?.content;
  if(!content) throw new Error("AI provider returned an empty response.");
  return JSON.parse(content);
}
module.exports = async function handler(req,res) {
  if(req.method==="GET") return send(res,200,{ok:true,service:"InterviewForge AI",configured:Boolean(process.env.OPENAI_API_KEY)});
  if(req.method!=="POST") { res.setHeader("Allow","GET, POST"); return send(res,405,{error:"Method not allowed"}); }
  try {
    const b=req.body || {};
    if(b.action==="generate") {
      const role=String(b.role||"").trim().slice(0,120), level=String(b.level||"Entry-level").slice(0,40), focus=String(b.focus||"Mixed").slice(0,80);
      const count=Math.min(10,Math.max(3,Number(b.count)||5));
      if(!role) return send(res,400,{error:"Target role is required."});
      const result=await askOpenAI(`Create exactly ${count} sequential mock interview questions for role: ${role}. Level: ${level}. Focus: ${focus}. Make questions progressively more challenging and cover practical job-relevant skills. Return JSON: {"questions":[{"question":"...","skill":"..."}]}. No answers.`);
      if(!Array.isArray(result.questions)||result.questions.length<count) throw new Error("Could not generate the requested questions. Try again.");
      return send(res,200,{questions:result.questions.slice(0,count)});
    }
    if(b.action==="evaluate") {
      const role=String(b.role||"").slice(0,120), level=String(b.level||"").slice(0,40), focus=String(b.focus||"").slice(0,80), question=String(b.question||"").slice(0,1500), answer=String(b.answer||"").trim().slice(0,7000);
      if(!role||!question||!answer) return send(res,400,{error:"Role, question, and answer are required."});
      const history=Array.isArray(b.history)?b.history.slice(-5).map(x=>({question:String(x.question||"").slice(0,500),score:Number(x.score)||0})): [];
      const result=await askOpenAI(`Evaluate this interview answer. Role: ${role}; level: ${level}; focus: ${focus}. Previous question/score context: ${JSON.stringify(history)}. Question: ${question}. Candidate answer: ${answer}. Score 0-100 based on correctness, relevance, depth, clarity and examples appropriate to level. Be constructive and do not reward unsupported claims. Return JSON with: score (integer), verdict (short string), strengths (array of 2-3 strings), improvements (array of 2-3 strings), model_answer (a concise example of a stronger answer). Do not assume details not in the answer.`);
      const score=Math.max(0,Math.min(100,Math.round(Number(result.score)||0)));
      return send(res,200,{score,verdict:String(result.verdict||"Evaluated"),strengths:Array.isArray(result.strengths)?result.strengths.slice(0,4):[],improvements:Array.isArray(result.improvements)?result.improvements.slice(0,4):[],model_answer:String(result.model_answer||"")});
    }
    return send(res,400,{error:"Unknown action."});
  } catch(e) { console.error("InterviewForge API:",e.message); return send(res, e.message.includes("OPENAI_API_KEY")?503:502,{error:e.message||"Interview service temporarily unavailable."}); }
};