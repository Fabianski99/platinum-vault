import { NextResponse } from "next/server";
import { getSteamId } from "@/lib/session";
import { getOwnedGames } from "@/lib/steam";

export const runtime="nodejs";

type StoreResponse={
  success?:boolean;
  data?:{
    type?:string;
    name?:string;
    dlc?:number[];
    categories?:{id:number;description:string}[];
  };
};

export async function GET(_request:Request,{params}:{params:Promise<{appId:string}>}){
  const steamId=await getSteamId();
  if(!steamId)return NextResponse.json({error:"Debes iniciar sesión con Steam."},{status:401});
  const {appId}=await params;
  if(!/^\d{1,10}$/.test(appId)||Number(appId)<1||Number(appId)>4294967295)
    return NextResponse.json({error:"AppID inválido."},{status:400});
  try{
    const library=await getOwnedGames(steamId);
    if(!library.some(item=>item.id===Number(appId)))
      return NextResponse.json({error:"El juego no pertenece a tu biblioteca visible."},{status:404});
    const url=new URL("https://store.steampowered.com/api/appdetails");
    url.searchParams.set("appids",appId);
    url.searchParams.set("l","spanish");
    const result=await fetch(url,{next:{revalidate:21600},signal:AbortSignal.timeout(9000)});
    if(!result.ok)throw new Error("Store unavailable");
    const json=await result.json() as Record<string,StoreResponse>;
    const details=json[appId];
    if(!details?.success||!details.data)return NextResponse.json({
      available:false,dlcIds:[],categories:[],
    },{headers:{"Cache-Control":"private, no-store"}});
    const dlcIds=(details.data.dlc??[]).filter(Number.isInteger).slice(0,24);
    return NextResponse.json({
      available:true,
      dlcIds,
      categories:(details.data.categories??[]).slice(0,12).map(item=>item.description),
    },{headers:{"Cache-Control":"private, no-store"}});
  }catch{
    return NextResponse.json({available:false,dlcIds:[],categories:[]},{headers:{"Cache-Control":"private, no-store"}});
  }
}
