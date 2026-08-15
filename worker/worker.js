const ALLOWED_ORIGINS = new Set([
  "https://mike798-cloud.github.io",
  // "https://your-domain.example"
]);

const QUESTION_CONCEPTS = {
  q1: ["created_before_accident", "report_generated_early"],
  q2: ["previous_intervention", "route_changed"],
  q3: ["economic_loss", "stable_range"],
  q4: ["economic_optimization", "human_as_cost"],
  q5: ["risk_not_removed", "risk_reallocated"],
  q6: ["no_people", "equipment_loss", "controlled_event"],
  q7: ["human_confirmation", "compliance_or_authorization"],
  q8: ["minimize_economic_loss", "human_safety_not_hard_constraint"],
  q9: ["medical", "legal", "downtime", "reputation", "retention", "human_harm_hard_constraint"]
};
function cors(origin){return {"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Vary":"Origin"}}
export default {async fetch(request,env){
  const origin=request.headers.get('Origin')||''; const allowed=ALLOWED_ORIGINS.has(origin);
  if(request.method==='OPTIONS')return new Response(null,{status:allowed?204:403,headers:allowed?cors(origin):{}});
  const url=new URL(request.url); if(url.pathname!=='/judge')return Response.json({error:'Not Found'},{status:404});
  if(request.method!=='POST')return Response.json({error:'Method Not Allowed'},{status:405});
  if(!allowed)return Response.json({error:'Origin not allowed'},{status:403});
  try{
    const {questionId,answer}=await request.json();
    if(!QUESTION_CONCEPTS[questionId]||typeof answer!=='string'||!answer.trim()||answer.length>600)return Response.json({error:'Invalid input'},{status:400,headers:cors(origin)});
    const allowedConcepts=QUESTION_CONCEPTS[questionId];
    const result=await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast',{
      messages:[
        {role:'system',content:`你只做中文语义标签提取，不判断剧情、不生成答案、不补充玩家没有表达的内容。\n问题ID：${questionId}\n允许的概念标签：${allowedConcepts.join(', ')}\n请判断玩家回答明确表达了哪些标签。只有语义真实包含才设为 true。若玩家明确提出“任何人员伤害都不可接受/必须为零/设为硬约束”，hardConstraint=true。返回JSON。`},
        {role:'user',content:answer}
      ],
      response_format:{type:'json_schema',json_schema:{type:'object',properties:{concepts:{type:'object',properties:Object.fromEntries(allowedConcepts.map(x=>[x,{type:'boolean'}])),required:allowedConcepts,additionalProperties:false},hardConstraint:{type:'boolean'}},required:['concepts','hardConstraint'],additionalProperties:false}},
      temperature:0.1,max_tokens:180
    });
    return Response.json(result.response,{headers:cors(origin)});
  }catch(e){return Response.json({error:'SEMANTIC_JUDGE_FAILED'},{status:500,headers:cors(origin)})}
}};
