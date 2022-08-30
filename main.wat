(module
  (import
    "env"
    "blit"
    (func
      $blit
      (param
        i32
        i32
        i32
        i32
        i32
        i32
      )
    )
  )
  (import
    "env"
    "blitSub"
    (func
      $blitSub
      (param
        i32
        i32
        i32
        i32
        i32
        i32
        i32
        i32
        i32
      )
    )
  )
  (import
    "env"
    "line"
    (func
      $line
      (param
        i32
        i32
        i32
        i32
      )
    )
  )
  (import
    "env"
    "hline"
    (func
      $hline
      (param i32 i32 i32)
    )
  )
  (import
    "env"
    "vline"
    (func
      $vline
      (param i32 i32 i32)
    )
  )
  (import
    "env"
    "oval"
    (func
      $oval
      (param
        i32
        i32
        i32
        i32
      )
    )
  )
  (import
    "env"
    "rect"
    (func
      $rect
      (param
        i32
        i32
        i32
        i32
      )
    )
  )
  (import
    "env"
    "text"
    (func
      $text
      (param i32 i32 i32)
    )
  )
  (import
    "env"
    "tone"
    (func
      $tone
      (param
        i32
        i32
        i32
        i32
      )
    )
  )
  (import
    "env"
    "diskr"
    (func
      $diskr
      (param i32 i32)
    )
  )
  (import
    "env"
    "diskw"
    (func
      $diskw
      (param i32 i32)
    )
  )
  (import
    "env"
    "trace"
    (func
      $trace
      (param i32)
    )
  )
  (import
    "env"
    "tracef"
    (func
      $tracef
      (param i32 i32)
    )
  )
  (memory $mem 1)
  (export
    "memory"
    (memory 0)
  )
  (global
    $mem_max_addr
    (mut i32)
    (i32.const 65536)
  )
  (global
    $mem_next_free
    (mut i32)
    (i32.const 0)
  )
  (func
    $mem_alloc
    (param $bytes i32)
    (result i32)
    (local $_result i32)
    (if
      (i32.lt_u
        (i32.sub
          (global.get $mem_max_addr)
          (global.get $mem_next_free)
        )
        (local.get $bytes)
      )
      (then
        (memory.grow
          (i32.div_u
            (i32.add
              (local.get $bytes)
              (i32.const 65527)
            )
            (i32.const 65528)
          )
        )
        (drop)
        (global.set
          $mem_max_addr
          (i32.add
            (global.get $mem_max_addr)
            (local.get $bytes)
          )
        )
      )
    )
    (local.set
      $_result
      (global.get $mem_next_free)
    )
    (global.set
      $mem_next_free
      (i32.add
        (local.get $bytes)
        (global.get $mem_next_free)
      )
    )
    (local.get $_result)
  )
  (func
    $False
    (result i32)
    (local $struct_start_address i32)
    (i32.const 4)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 0)
    )
    (local.get $struct_start_address)
  )
  (func
    $True
    (result i32)
    (local $struct_start_address i32)
    (i32.const 4)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 1)
    )
    (local.get $struct_start_address)
  )
  (func
    $add
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.add
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $eqNumeric
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.eq
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $sin
    (param $x f32)
    (result f32)
    (f32.const 1)
  )
  (func
    $rectR
    (param $x i32)
    (param $y i32)
    (param $w i32)
    (param $h i32)
    (local.get $x)
    (local.get $y)
    (local.get $w)
    (local.get $h)
    (call $rect)
  )
  (func
    $clock
    (param $address i32)
    (result i32)
    (local $newclock i32)
    (i32.add
      (i32.load16_u
        (local.get $address)
      )
      (i32.const 1)
    )
    (local.set $newclock)
    (i32.store16
      (local.get $address)
      (local.get $newclock)
    )
    (local.get $newclock)
  )
  (func
    $divU
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.div_u
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $eq
    (param $a i32)
    (param $b i32)
    (result i32)
    (local $var_90285 i32)
    (local.set
      $var_90285
      (local.get $a)
      (local.get $b)
      (call $eqNumeric)
    )
    (if
      (result i32)
      (i32.eq
        (local.get $var_90285)
        (i32.const 1)
      )
      (then
        (call $True)
      )
      (else
        (if
          (result i32)
          (i32.const 1)
          (then
            (call $False)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "eq"
    (func $eq)
  )
  (func
    $update
    (local $clockAddress i32)
    (local $c i32)
    (local $x i32)
    (i32.const 64)
    (local.set $clockAddress)
    (local.get $clockAddress)
    (call $clock)
    (local.set $c)
    (local.get $c)
    (i32.const 30)
    (call $divU)
    (local.set $x)
    (local.get $x)
    (i32.const 10)
    (i32.const 32)
    (i32.const 32)
    (call $rectR)
  )
  (export
    "update"
    (func $update)
  )
)