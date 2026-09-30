import {mountAppRollout} from './app-wiring.mjs';
try{
 window.MealUpG11=await mountAppRollout({app:window.MealUpVisualData});
 // Each stage is activated after the previous bindings have settled.
 for(let i=1;i<8;i++)await window.MealUpG11.advance();
}catch(e){window.MealUpG11BootError=e.message;console.error(e);}
