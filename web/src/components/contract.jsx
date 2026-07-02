import { ethers } from "ethers";
import test from "../../artifacts/test_metadata.json"
import { supabaseClient } from "../supabase/supabaseClient";

const provider = new ethers.JsonRpcProvider(
    "https://sepolia.infura.io/v3/b077b0b203bd417ea673ff1eb7dd601d",
);
const privateKey =
    "18096ad45f87801fa1225bb3243f6f67f200988732c3a5ea30ddec70362d188a";
const wallet = new ethers.Wallet(privateKey, provider);
const contract_address = "0x0EC104F233A548A348c48FC7476c349A89B7b87d"
const contract = new ethers.Contract(contract_address,test.output.abi,wallet)

export async function storeHash(file,hash){
    const tx = await contract.storeHash(hash)
    await tx.wait()

    const {data,error} = await supabaseClient.from("file_hash").insert({
        filename:file.name,
        hash:hash,
        transaction_hash: tx.hash
    })

    console.log(data)

    if(error)throw error
}

export async function verifyHash(hash){
    const isVerified = await contract.verifyHash(hash)
    console.log(isVerified)
    return isVerified
}
