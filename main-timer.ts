/*******************************************************************************
 * Copyright (C) 2019 Gallium Studio LLC (Lawrence Lo). All rights reserved.
 *
 * This program is open source software: you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * Contact information:
 * Website - https://www.galliumstudio.com
 * Source repository - https://github.com/galliumstudio
 * Email - admin@galliumstudio.com
 ******************************************************************************/

// Extended state variables.
let intervalMs = 0
let remainingTime = 0
let flashOn = false
let ledCount = 1

// Event and state enumerations
enum Evt {
    EVT_START,
    // TIMER events
    TIMER_FLASH,
    TIMER_INTERVAL,
    TIMER_STOP,
    // INTERNAL events
    A_PRESSED,
    B_PRESSED,
    TIMEOUT,
}
enum Region {
    MAIN,
}
enum MainState {
    STOPPED,
    RUNNING,
    PAUSED,
    TIMED_OUT,
}

// Helper functions defining state hierarchy.
function inMainStopped() { return state.isIn(Region.MAIN, MainState.STOPPED) }
function inMainRunning() { return state.isIn(Region.MAIN, MainState.RUNNING) }
function inMainPaused() { return state.isIn(Region.MAIN, MainState.PAUSED) }
function inMainTimedOut() { return state.isIn(Region.MAIN, MainState.TIMED_OUT) }
function inMainStarted() { return inMainRunning() || inMainPaused() || inMainTimedOut() }

// Generates internal events from built-in/external events.
input.onButtonPressed(Button.B, function () {
    event.raise(Evt.B_PRESSED)
})
input.onButtonPressed(Button.A, function () {
    event.raise(Evt.A_PRESSED)
})

// Updates built-in LED display on Microbit
function display(count: number) {
    basic.clearScreen()
    for (let i = 0; i <= count - 1; i++) {
        led.plot(i % 5, i / 5)
    }
}

// Entry and exit actions.
state.onEntry(Region.MAIN, MainState.STOPPED, () => {
    flashOn = true
    display(ledCount)
    timer.start(Evt.TIMER_FLASH, 500, true)
})
state.onExit(Region.MAIN, MainState.STOPPED, () => {
    timer.stop(Evt.TIMER_FLASH)
})

state.onEntry(Region.MAIN, MainState.PAUSED, () => {
    led.setBrightness(50)
})
state.onExit(Region.MAIN, MainState.PAUSED, () => {
    led.setBrightness(255)
})

state.onEntry(Region.MAIN, MainState.RUNNING, () => {
    timer.start(Evt.TIMER_INTERVAL, intervalMs, true)
})
state.onExit(Region.MAIN, MainState.RUNNING, () => {
    timer.stop(Evt.TIMER_INTERVAL)
})

state.onEntry(Region.MAIN, MainState.TIMED_OUT, () => {
    timer.start(Evt.TIMER_FLASH, 100, true)
    timer.start(Evt.TIMER_STOP, 10000)
    flashOn = true
})
state.onExit(Region.MAIN, MainState.TIMED_OUT, () => {
    timer.stop(Evt.TIMER_INTERVAL)
    timer.stop(Evt.TIMER_STOP)
})

// Transition actions.
event.on(Evt.A_PRESSED, () => {
    if (inMainStopped()) {
        // For testing, change 1000 to 100 to have the timer running 10x faster.
        remainingTime = ledCount * 2 * 60 * 1000 // 100
        intervalMs = remainingTime / 24
        ledCount = 1
        display(ledCount)
        state.transit(Region.MAIN, MainState.RUNNING)
    } else if (inMainStarted()) {
        event.raise(Evt.TIMER_STOP)
    }
})
event.on(Evt.B_PRESSED, () => {
    if (inMainStopped()) {
        ledCount = ledCount % 25 + 1
        state.transit(Region.MAIN, MainState.STOPPED)
    } else if (inMainRunning()) {
        state.transit(Region.MAIN, MainState.PAUSED)
    } else if (inMainPaused()) {
        state.transit(Region.MAIN, MainState.RUNNING)
    }
})
event.on(Evt.TIMER_FLASH, () => {
    if (!flashOn) {
        flashOn = true
        display(ledCount)
    } else {
        flashOn = false
        display(0)
    }
})
event.on(Evt.TIMER_INTERVAL, () => {
    if (inMainRunning()) {
        display(++ledCount)
        remainingTime -= intervalMs
        if (remainingTime <= 0) {
            event.raise(Evt.TIMEOUT)
        }
    }
})
event.on(Evt.TIMEOUT, () => {
    if (inMainRunning()) {
        state.transit(Region.MAIN, MainState.TIMED_OUT)
    }
})
event.on(Evt.TIMER_STOP, () => {
    if (inMainStarted()) {
        ledCount = 1
        state.transit(Region.MAIN, MainState.STOPPED)
    }
})

// Main code.
timer.run()
state.initial(Region.MAIN, MainState.STOPPED)
