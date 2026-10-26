 import uploadOnCloudinary from "../config/cloudinary.js"
import geminiResponse from "../gemini.js"
import User from "../models/user.model.js"
import moment from "moment"

const resolveLocalCommand=(command)=>{
   const normalized=command.toLowerCase().trim()
   const searchText=command.replace(/\b(search|play|open|on|youtube|google|for)\b/gi," ").trim()

   if(normalized.includes("youtube")){
      return {
         type: searchText ? "youtube-search" : "youtube-play",
         userInput: searchText,
         response: searchText ? "Here is what I found on YouTube." : "Opening YouTube now."
      }
   }
   if(normalized.includes("google search") || normalized.startsWith("search google")){
      const googleText=command.replace(/\b(search|google|for)\b/gi," ").trim()
      return {type:"google-search",userInput:googleText,response:"Here is what I found on Google."}
   }
   if(normalized.includes("calculator")){
      return {type:"calculator-open",userInput:"",response:"Opening the calculator now."}
   }
   if(normalized.includes("instagram")){
      return {type:"instagram-open",userInput:"",response:"Opening Instagram now."}
   }
   if(normalized.includes("facebook")){
      return {type:"facebook-open",userInput:"",response:"Opening Facebook now."}
   }
   if(normalized.includes("weather")){
      return {type:"weather-show",userInput:"",response:"Opening the weather now."}
   }
   if(normalized.includes("time")){
      return {type:"get-time",userInput:command,response:`current time is ${moment().format("hh:mm A")}`}
   }
   if(normalized.includes("date")){
      return {type:"get-date",userInput:command,response:`current date is ${moment().format("YYYY-MM-DD")}`}
   }
   if(normalized.includes("what day") || normalized.includes("which day")){
      return {type:"get-day",userInput:command,response:`today is ${moment().format("dddd")}`}
   }
   if(normalized.includes("month")){
      return {type:"get-month",userInput:command,response:`current month is ${moment().format("MMMM")}`}
   }
   return null
}

 export const getCurrentUser=async (req,res)=>{
    try {
        const userId=req.userId
        const user=await User.findById(userId).select("-password")
        if(!user){
return res.status(400).json({message:"user not found"})
        }

   return res.status(200).json(user)     
    } catch (error) {
       return res.status(400).json({message:"get current user error"}) 
    }
}

export const updateAssistant=async (req,res)=>{
   try {
      const {assistantName,imageUrl}=req.body
      let assistantImage;
if(req.file){
   assistantImage=await uploadOnCloudinary(req.file.path)
}else{
   assistantImage=imageUrl
}

if(!assistantImage){
   return res.status(400).json({message:"assistant image is required"})
}

const user=await User.findByIdAndUpdate(req.userId,{
   assistantName,assistantImage
},{new:true}).select("-password")
return res.status(200).json(user)

      
   } catch (error) {
       return res.status(400).json({message:"updateAssistantError user error"}) 
   }
}


export const askToAssistant=async (req,res)=>{
   try {
      const {command}=req.body
      if(!command || typeof command !== "string"){
         return res.status(400).json({response:"Please enter a command."})
      }
      const user=await User.findById(req.userId);
      if(!user){
         return res.status(404).json({response:"User not found."})
      }
      user.history.push(command)
      await user.save()
      const userName=user.name
      const assistantName=user.assistantName
      const localResult=resolveLocalCommand(command)
      if(localResult){
         return res.json(localResult)
      }
      const result=await geminiResponse(command,assistantName,userName)

      const jsonMatch=result.match(/{[\s\S]*}/)
      if(!jsonMatch){
         return res.status(400).json({response:"sorry, i can't understand"})
      }
      let gemResult
      try {
         gemResult=JSON.parse(jsonMatch[0])
      } catch (parseError) {
         console.error("Invalid Gemini JSON:", result)
         return res.status(400).json({response:"I couldn't understand that command."})
      }
      console.log(gemResult)
      const type=gemResult.type

      switch(type){
         case 'get-date' :
            return res.json({
               type,
               userInput:gemResult.userInput,
               response:`current date is ${moment().format("YYYY-MM-DD")}`
            });
            case 'get-time':
                return res.json({
               type,
               userInput:gemResult.userInput,
               response:`current time is ${moment().format("hh:mm A")}`
            });
             case 'get-day':
                return res.json({
               type,
               userInput:gemResult.userInput,
               response:`today is ${moment().format("dddd")}`
            });
            case 'get-month':
                return res.json({
               type,
               userInput:gemResult.userInput,
               response:`today is ${moment().format("MMMM")}`
            });
      case 'google-search':
      case 'youtube-search':
      case 'youtube-play':
      case 'general':
      case  "calculator-open":
      case "instagram-open": 
       case "facebook-open": 
       case "weather-show" :
         return res.json({
            type,
            userInput:gemResult.userInput,
            response:gemResult.response,
         });

         default:
            return res.status(400).json({ response: "I didn't understand that command." })
      }
     

   } catch (error) {
  console.error("Ask assistant error:", error.response?.data || error.message)
  const command = typeof req.body?.command === "string" ? req.body.command.trim() : ""
  if (/youtube/i.test(command)) {
     const searchText = command.replace(/\b(play|open|search|on|youtube|for)\b/gi, " ").trim()
     return res.json({
        type: searchText ? "youtube-search" : "youtube-play",
        userInput: searchText,
        response: searchText ? "Here is what I found on YouTube." : "Opening YouTube now."
     })
  }
  const providerStatus=error.response?.status
  if(providerStatus === 401 || providerStatus === 403){
     return res.status(502).json({response:"The Gemini API key is invalid or does not have access."})
  }
  if(providerStatus === 429){
     return res.status(502).json({response:"The Gemini API quota has been exceeded. Try again later."})
  }
  if(providerStatus === 404){
     return res.status(502).json({response:"The configured Gemini model or API endpoint was not found."})
  }
  return res.status(502).json({ response: "The AI service is unavailable right now." })
   }
}
