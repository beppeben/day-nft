package main

import (
	"context"
	"flag"
	"fmt"
	"math/rand"
	"os/exec"
	"sync"
	"time"

	"github.com/onflow/flow-go-sdk/client"
	"google.golang.org/grpc"
)

type Config struct {
	Host         string
	Address      string
	SketchPath   string
	ImgPath      string
	MaxDepth     int
	EverySeconds int
}

func main() {

	config := readArgs()

	block := queryAndProcessEvents(config, 0)

	for {
		time.Sleep(time.Duration(config.EverySeconds) * time.Second)
		block = queryAndProcessEvents(config, block)
	}

}

func readArgs() Config {
	hostPtr := flag.String("host", "", "")
	addressPtr := flag.String("address", "", "")
	sketchPathPtr := flag.String("sketch_path", "", "")
	imgPathPtr := flag.String("img_path", "", "")
	maxDepthPtr := flag.Int("max_depth", 0, "")
	everySecondsPtr := flag.Int("every_seconds", 0, "")

	flag.Parse()

	config := Config{Host: *hostPtr, Address: *addressPtr, SketchPath: *sketchPathPtr,
		ImgPath: *imgPathPtr, MaxDepth: *maxDepthPtr, EverySeconds: *everySecondsPtr}

	return config
}

func generateImage(config Config, name string, date string, message string) {
	imgPath := config.ImgPath + name
	cmd := exec.Command("node", "node_p5.js", config.SketchPath, date, message, imgPath)
	_, err := cmd.Output()
	if err != nil {
		fmt.Println("[ERROR]: " + err.Error())
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func queryAndProcessEvents(config Config, lastBlock uint64) uint64 {
	ctx := context.Background()

	flowClient, err := client.New(config.Host, grpc.WithInsecure())
	if err != nil {
		fmt.Println("[ERROR]: " + err.Error())
		return 0
	}

	block, err := flowClient.GetLatestBlock(ctx, true, grpc.EmptyCallOption{})
	if err != nil {
		fmt.Println("[ERROR]: " + err.Error())
		return 0
	}

	customType := fmt.Sprintf("A.%s.DayNFT.Minted", config.Address)
	end := block.Height
	retries := 5
	actualDepth := min(int((block.Height-lastBlock)/249+1), config.MaxDepth)
	fmt.Printf("[INFO]: Starting update with depth %d", actualDepth)
	fmt.Println()
	var wg sync.WaitGroup
	for i := 1; i <= actualDepth; i++ {
		wg.Add(1)
		start := end - 249
		go func(wg *sync.WaitGroup, start uint64, end uint64) {
			defer wg.Done()
			for j := 1; j <= retries; j++ {
				time.Sleep(time.Duration(rand.Intn(500)) * time.Millisecond)
				result, err := flowClient.GetEventsForHeightRange(ctx, client.EventRangeQuery{
					Type:        customType,
					StartHeight: start,
					EndHeight:   end,
				})
				if err == nil {
					processEvents(config, result)
					break
				} else if j == retries {
					fmt.Println("[ERROR]: " + err.Error())
				}
			}
		}(&wg, start, end)
		end = start
	}
	wg.Wait()
	fmt.Println("[INFO]: Update done")
	return block.Height
}

func processEvents(config Config, result []client.BlockEvents) {
	for _, block := range result {
		for _, event := range block.Events {
			id := event.Value.Fields[0].String()
			date := event.Value.Fields[1].String()
			date = date[1 : len(date)-1]
			message := event.Value.Fields[2].String()
			message = message[1 : len(message)-1]
			fmt.Println("[INFO]: Generating image for date " + date)
			generateImage(config, id, date, message)
		}
	}
}
