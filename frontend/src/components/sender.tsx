import { useEffect, useState, useRef } from "react"

export function Sender() {

    const [socket, setSocket] = useState<WebSocket | null>(null);
    let pc: RTCPeerConnection | null = null;
    const videoRef = useRef<HTMLVideoElement>(null);
    var [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080')
        socket.onopen = () => {
            socket.send(JSON.stringify({ type: 'sender' }))
        }
        setSocket(socket);
    }, [])

    async function startSendingVideo() {
        if (!socket) return;
        pc = new RTCPeerConnection();

        pc.onnegotiationneeded = async () => {
            console.log("onnegotiationneeded")
            const offer = await pc?.createOffer();
            await pc?.setLocalDescription(offer);
            socket?.send(JSON.stringify({ type: 'createOffer', sdp: pc?.localDescription }))
        }

        pc.onicecandidate = (event) => {
            console.log(event)
            if (event.candidate) {
                socket.send(JSON.stringify({ type: 'iceCandidate', candidate: event.candidate }))
            }
        }

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'createAnswer') {
                pc?.setRemoteDescription(data.sdp);
            } else if (data.type === 'iceCandidate') {
                pc?.addIceCandidate(data.candidate);
            }
        }

        console.log("before setting stream")

        if (stream == null) {
            console.log("setting stream")
            let tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            console.log(tempStream)
            setStream(tempStream);
            console.log(stream)
        }
        console.log("after setting stream")
        console.log(stream)
        stream?.getTracks().forEach((track) => {
            pc?.addTrack(track)
        })
        console.log("tracks added")
        //@ts-ignore
        videoRef.current.srcObject = stream
        //@ts-ignore
        videoRef.current.play()
        console.log("video being played")
    }

    async function stopSendingVideo() {
        console.log("stop video")
        if (stream == null) {
            alert("Video is not being shared")
        } else {
            await stream?.getTracks().forEach(track => track.stop())
            setStream(null)
            console.log("done")
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="text-2xl">Host</div>
            <button onClick={startSendingVideo}>Share Video</button>
            <button onClick={stopSendingVideo}>Stop Video</button>
            <video ref={videoRef}></video>
        </div>
    )
}