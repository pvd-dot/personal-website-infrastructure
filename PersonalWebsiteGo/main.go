package main

import (
	"image"
	"image/color"
	"image/color/palette"
	"image/draw"
	"image/gif"
	"io"
	"log"
	"math"
	"math/rand"
	"net/http"
)

// Minimal Golang webserver that serves a different Lissajous animation gif on every response
// Lissajous code is from the book The Go Programming Language by Alan A. A. Donovan and Brian W. Kernighan
func lissajous(out io.Writer) {
	const (
		cycles  = 5
		res     = 0.001
		size    = 100
		nframes = 64
		delay   = 8
	)
	freq := rand.Float64() * 3.0
	anim := gif.GIF{LoopCount: nframes}
	phase := 0.0
	green := color.RGBA{R: 0, G: 255, B: 0, A: 255}         // Green color
	backgroundColor := color.RGBA{R: 0, G: 0, B: 0, A: 255} // Example: White background

	for i := 0; i < nframes; i++ {
		rect := image.Rect(0, 0, 2*size+1, 2*size+1)
		img := image.NewRGBA(rect.Bounds())
		draw.Draw(img, img.Bounds(), &image.Uniform{C: backgroundColor}, image.Point{}, draw.Src)
		for t := 0.0; t < cycles*2*math.Pi; t += res {
			x := math.Sin(t)
			y := math.Sin(t*freq + phase)
			img.SetRGBA(size+int(x*size+0.5), size+int(y*size+0.5), green)
		}
		phase += 0.2
		anim.Delay = append(anim.Delay, delay)
		palettedImg := image.NewPaletted(img.Bounds(), palette.Plan9)
		draw.Draw(palettedImg, palettedImg.Rect, img, img.Bounds().Min, draw.Src)
		anim.Image = append(anim.Image, palettedImg)
	}
	gif.EncodeAll(out, &anim)
}

func main() {
	http.HandleFunc("/", handler)
	log.Fatal(http.ListenAndServe(":8000", nil))
}

func handler(w http.ResponseWriter, r *http.Request) {
	lissajous(w)
}
